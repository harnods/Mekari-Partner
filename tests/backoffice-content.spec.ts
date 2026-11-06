/**
 * Backoffice config & content modules — Document Repository, Announcements,
 * Roster Management, Configurations, Master Agreements. Covers the flows the pages
 * drive through app/data/backoffice.ts (CRUD, blocked deletes, MA lifecycle,
 * deprecate → re-agreement batch visible in the Document Repository), plus
 * source-level guards on the page components (Pixel ERP rules).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  bo, resetBackoffice, setBoToday, allDocuments, agStatus, announcementsSorted, saveAnnouncement,
  deleteAnnouncement, getAnnouncement, rosterList, saveRosterPerson, deleteRosterPerson, saveMaster,
  deleteMaster, masterUsedBy, saveMa, getMa, setMaStatus, maAllowedStatuses, duplicateMa,
  deprecateOptions, deprecateMa, impact, BO_MASTER_META, BO_CFG_ORDER,
} from '~/data/backoffice'

beforeEach(() => {
  resetBackoffice()
  setBoToday('2026-11-06')
})

describe('Announcements (O-01 … O-04)', () => {
  it('lists newest first and posts a new one on top', () => {
    const before = announcementsSorted().map((a) => a.id)
    expect(before[0]).toBe('an3')
    const res = saveAnnouncement({ id: null, title: 'Summit', desc: 'Save the date.', content: '<p>Hi</p>' })
    expect(res.ok).toBe(true)
    expect(announcementsSorted()[0]!.id).toBe(res.id)
  })
  it('rejects empty fields (incl. tag-only content) inline', () => {
    const res = saveAnnouncement({ id: null, title: ' ', desc: '', content: '<p><br></p>' })
    expect(res.ok).toBe(false)
    expect(Object.keys(res.errors!)).toEqual(['title', 'desc', 'content'])
  })
  it('edit keeps postedAt; delete removes it', () => {
    const a = getAnnouncement('an1')!
    const posted = a.postedAt
    expect(saveAnnouncement({ id: 'an1', title: 'Changed', desc: a.desc, content: a.content }).ok).toBe(true)
    expect(getAnnouncement('an1')!.postedAt).toBe(posted)
    deleteAnnouncement('an1')
    expect(getAnnouncement('an1')).toBeUndefined()
  })
})

describe('Roster (I-10 / I-11)', () => {
  it('adds, rejects duplicate email, and deletes an unassigned person', () => {
    const n = rosterList('owners').length
    expect(saveRosterPerson('owners', -1, { name: 'Sari', email: 'sari@mekari.com', products: ['Talenta'] }).ok).toBe(true)
    expect(rosterList('owners').length).toBe(n + 1)
    const dup = saveRosterPerson('owners', -1, { name: 'Other', email: 'SARI@mekari.com', products: ['Talenta'] })
    expect(dup.ok).toBe(false)
    expect(dup.errors!.email).toBeTruthy()
    expect(deleteRosterPerson('owners', n).ok).toBe(true)
    expect(rosterList('owners').length).toBe(n)
  })
  it('blocks deleting an assigned Account Owner / Technical PIC', () => {
    const idx = rosterList('owners').findIndex((p) => p.email === 'dimas.ardiansyah@mekari.com')
    const res = deleteRosterPerson('owners', idx)
    expect(res.ok).toBe(false)
    expect(res.msg).toMatch(/cannot be deleted/)
    const tIdx = rosterList('trainers').findIndex((p) => bo.partners.some((x) => x.tech === p.email))
    expect(deleteRosterPerson('trainers', tIdx).ok).toBe(false)
  })
})

describe('Configurations (I-02)', () => {
  it('every master key in the sidebar order has page meta', () => {
    for (const [k] of BO_CFG_ORDER) if (k !== 'master-agreements') expect(BO_MASTER_META[k]).toBeTruthy()
  })
  it('adds a partner role with responsibilities and blocks deleting one in use', () => {
    expect(saveMaster('roles', -1, { name: 'Trainer', desc: 'x', resp: ['Deliver training'] }).ok).toBe(true)
    expect(bo.masters.roles.at(-1)!.resp).toEqual(['Deliver training'])
    expect(saveMaster('roles', -1, { name: 'trainer' }).ok).toBe(false) // case-insensitive duplicate
    const reseller = bo.masters.roles.findIndex((r) => r.name === 'Reseller')
    expect(masterUsedBy('roles', 'Reseller')).toBe(true)
    expect(deleteMaster('roles', reseller).ok).toBe(false)
    expect(deleteMaster('roles', bo.masters.roles.length - 1).ok).toBe(true)
  })
  it('a responsibility used by a role cannot be deleted', () => {
    const i = bo.masters.responsibilities.findIndex((r) => r.name === 'Refer leads')
    expect(deleteMaster('responsibilities', i).ok).toBe(false)
  })
})

describe('Master agreements (I-07 / I-09 / L-02)', () => {
  it('creates as DRAFT, validates PRIMARY products + roles + PDF', () => {
    const bad = saveMa({ id: null, name: 'X', desc: '', type: 'PRIMARY', products: { Talenta: [] }, pdf: '' })
    expect(bad.ok).toBe(false)
    expect(bad.errors!.products).toBeTruthy()
    expect(bad.errors!.pdf).toBeTruthy()
    const ok = saveMa({ id: null, name: 'PA 2027', desc: '', type: 'PRIMARY', products: { Talenta: ['Reseller'] }, pdf: 'pa.pdf' })
    expect(ok.ok).toBe(true)
    expect(getMa(ok.id)!.status).toBe('DRAFT')
    expect(maAllowedStatuses(getMa(ok.id)!)).toEqual(['ACTIVE'])
  })
  it('type is fixed once saved; OTHERS drop products', () => {
    const r = saveMa({ id: null, name: 'NDA 2', desc: '', type: 'OTHERS', products: { Talenta: ['Reseller'] }, pdf: 'n.pdf' })
    expect(getMa(r.id)!.products).toEqual({})
    saveMa({ id: r.id!, name: 'NDA 2', desc: '', type: 'PRIMARY', products: {}, pdf: 'n.pdf' })
    expect(getMa(r.id)!.type).toBe('OTHERS')
  })
  it('a used ACTIVE master agreement cannot return to DRAFT', () => {
    expect(maAllowedStatuses(getMa('ma1')!)).toEqual(['DEPRECATED'])
    expect(setMaStatus('ma1', 'DRAFT').ok).toBe(false)
    expect(setMaStatus('ma1', 'DEPRECATED').ok).toBe(false) // must go through deprecateMa
  })
  it('duplicate makes a DRAFT copy', () => {
    const d = duplicateMa('ma1')
    expect(getMa(d.id)!.status).toBe('DRAFT')
  })
  it('deprecate needs an ACTIVE same-type replacement and lands PENDING docs in the repository', () => {
    const r = saveMa({ id: null, name: 'PA 2027', desc: '', type: 'PRIMARY', products: { Talenta: ['Reseller'] }, pdf: 'pa.pdf' })
    expect(deprecateOptions('ma1').some((m) => m.id === r.id)).toBe(false) // still DRAFT
    expect(deprecateMa('ma1', r.id!).ok).toBe(false)
    setMaStatus(r.id!, 'ACTIVE')
    const imp = impact('ma1')
    const before = allDocuments().length
    const res = deprecateMa('ma1', r.id!)
    expect(res.ok).toBe(true)
    expect(res.created).toBe(imp.docs.length)
    expect(getMa('ma1')!.status).toBe('DEPRECATED')
    expect(maAllowedStatuses(getMa('ma1')!)).toEqual([])
    const batch = allDocuments().filter((e) => e.row.ma === r.id)
    expect(allDocuments().length).toBe(before + imp.docs.length)
    expect(batch.every((e) => agStatus(e.row) === 'PENDING' && !!e.row.replaces)).toBe(true)
  })
})

describe('page components follow the Pixel ERP rules', () => {
  const dir = join(process.cwd(), 'app/components/backoffice/content')
  const vue = readdirSync(dir).filter((f) => f.endsWith('.vue'))
  const src = (f: string) => readFileSync(join(dir, f), 'utf8')
  it('routes exist (master-agreements is its own folder beside [key])', () => {
    for (const p of ['documents.vue', 'account-owners.vue', 'trainers.vue', 'announcements/index.vue', 'announcements/new.vue', 'announcements/[id].vue',
      'configurations/[key].vue', 'configurations/master-agreements/index.vue', 'configurations/master-agreements/new.vue', 'configurations/master-agreements/[id].vue']) {
      expect(existsSync(join(process.cwd(), 'app/pages/backoffice', p)), p).toBe(true)
    }
  })
  it('no MpSelect / native select / MpDrawer', () => {
    for (const f of vue) expect(src(f), f).not.toMatch(/<MpSelect\b|<select[\s>]|<MpDrawer\b/)
  })
  it('every MpModal closes only explicitly', () => {
    for (const f of vue) {
      const s = src(f)
      const n = (s.match(/<MpModal\b/g) || []).length
      expect((s.match(/:is-close-on-esc="false"/g) || []).length, f).toBe(n)
      expect((s.match(/:is-close-on-overlay-click="false"/g) || []).length, f).toBe(n)
    }
  })
  it('index pages use ErpTablePage + ScenarioFab + ExportModal; buttons are never disabled', () => {
    for (const f of ['BoDocumentsPage.vue', 'BoAnnouncementsPage.vue', 'BoRosterPage.vue', 'BoMasterPage.vue', 'BoMaListPage.vue']) {
      const s = src(f)
      expect(s, f).toMatch(/<ErpTablePage/)
      expect(s, f).toMatch(/<ScenarioFab/)
      expect(s, f).toMatch(/<ExportModal/)
      expect(s, f).toMatch(/#empty/)
    }
    for (const f of vue) expect(src(f), f).not.toMatch(/<MpButton[^>]*:?is-disabled/)
  })
  it('no toast for errors and no placeholders on form fields', () => {
    for (const f of vue) {
      const s = src(f)
      expect(s, f).not.toMatch(/errorToast|variant: 'error'/)
      expect(s, f).not.toMatch(/<(MpInput|MpTextarea)\b[^>]*placeholder=/)
    }
  })
})
