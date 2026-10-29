import {
  collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp,
  setDoc, startAfter, where, runTransaction, writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

export async function fetchReports({ municipality, category, status, search, count = 60 } = {}) {
  const snapshot = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(count)))
  let reports = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  if (municipality) reports = reports.filter((report) => report.municipality === municipality)
  if (category) reports = reports.filter((report) => report.category === category)
  if (status) reports = reports.filter((report) => report.status === status)
  if (search) {
    const term = search.trim().toLocaleLowerCase('sq')
    reports = reports.filter((report) => `${report.title} ${report.description} ${report.municipality}`.toLocaleLowerCase('sq').includes(term))
  }
  return reports
}

export async function fetchStats() {
  const reports = collection(db, 'reports')
  const [total, reviewing, inProgress, resolved] = await Promise.all([
    getCountFromServer(reports),
    getCountFromServer(query(reports, where('status', '==', 'reviewing'))),
    getCountFromServer(query(reports, where('status', '==', 'in_progress'))),
    getCountFromServer(query(reports, where('status', '==', 'resolved'))),
  ])
  return {
    total: total.data().count,
    reviewing: reviewing.data().count,
    inProgress: inProgress.data().count,
    resolved: resolved.data().count,
  }
}

export async function fetchUserReports(uid, cursor = null, pageSize = 12) {
  const constraints = [where('authorUid', '==', uid), orderBy('createdAt', 'desc')]
  if (cursor) constraints.push(startAfter(cursor))
  constraints.push(limit(pageSize + 1))
  const snapshot = await getDocs(query(collection(db, 'reports'), ...constraints))
  const documents = snapshot.docs.slice(0, pageSize)
  return {
    reports: documents.map((item) => ({ id: item.id, ...item.data() })),
    nextCursor: snapshot.docs.length > pageSize ? documents.at(-1) : null,
  }
}

export async function fetchUserStats(uid) {
  const reports = collection(db, 'reports')
  const owned = (status) => query(
    reports,
    where('authorUid', '==', uid),
    ...(status ? [where('status', '==', status)] : []),
  )
  const [total, reviewing, inProgress, resolved] = await Promise.all([
    getCountFromServer(owned()),
    getCountFromServer(owned('reviewing')),
    getCountFromServer(owned('in_progress')),
    getCountFromServer(owned('resolved')),
  ])
  return {
    total: total.data().count,
    active: reviewing.data().count + inProgress.data().count,
    resolved: resolved.data().count,
  }
}

export async function fetchReport(id) {
  const snapshot = await getDoc(doc(db, 'reports', id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function createProfile(user, displayName) {
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email: user.email,
    createdAt: serverTimestamp(),
    photoURL: user.photoURL || '',
    preferredMunicipality: '',
  }, { merge: true })
}

export async function createReport(values, image, uid, onProgress) {
  let imageUrls = []
  if (image) {
    const imageRef = ref(storage, `report-images/${uid}/${crypto.randomUUID()}-${image.name}`)
    const task = uploadBytesResumable(imageRef, image, { contentType: image.type })
    await new Promise((resolve, reject) => {
      task.on('state_changed', (snapshot) => {
        onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      }, reject, resolve)
    })
    imageUrls = [await getDownloadURL(task.snapshot.ref)]
  }
  const report = {
    ...values, authorUid: uid, imageUrls, confirmationCount: 0, status: 'reported',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastStatusHistoryId: 'initial',
  }
  const reportRef = doc(collection(db, 'reports'))
  const batch = writeBatch(db)
  batch.set(reportRef, report)
  batch.set(doc(db, 'reports', reportRef.id, 'statusHistory', 'initial'), {
    previousStatus: null, newStatus: 'reported', changedBy: uid,
    note: 'Raportimi u pranua.', createdAt: serverTimestamp(),
  })
  await batch.commit()
  return reportRef.id
}

export async function confirmReport(reportId, uid) {
  const reportRef = doc(db, 'reports', reportId)
  const confirmationRef = doc(db, 'reports', reportId, 'confirmations', uid)
  await runTransaction(db, async (transaction) => {
    const [report, confirmation] = await Promise.all([
      transaction.get(reportRef), transaction.get(confirmationRef),
    ])
    if (!report.exists()) throw new Error('Raportimi nuk u gjet.')
    if (confirmation.exists()) throw new Error('E keni konfirmuar tashmë këtë raportim.')
    transaction.set(confirmationRef, { userUid: uid, createdAt: serverTimestamp() })
    transaction.update(reportRef, {
      confirmationCount: (report.data().confirmationCount || 0) + 1,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function updateReportStatus(reportId, newStatus, note, uid) {
  const reportRef = doc(db, 'reports', reportId)
  const historyRef = doc(collection(db, 'reports', reportId, 'statusHistory'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reportRef)
    if (!snapshot.exists()) throw new Error('Raportimi nuk u gjet.')
    const previousStatus = snapshot.data().status
    transaction.update(reportRef, {
      status: newStatus, updatedAt: serverTimestamp(), lastStatusHistoryId: historyRef.id,
    })
    transaction.set(historyRef, {
      previousStatus, newStatus, changedBy: uid, note: note.trim(), createdAt: serverTimestamp(),
    })
  })
}

export async function fetchHistory(reportId) {
  const snapshot = await getDocs(query(
    collection(db, 'reports', reportId, 'statusHistory'), orderBy('createdAt', 'asc'),
  ))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}
