export function statusClass(status: string) {
  const s = status.toLowerCase()
  if (!s) return 'empty'
  if (s.includes('tercapai') && !s.includes('tidak')) return 'ok'
  if (s.includes('tidak') || s.includes('gak selesai')) return 'miss'
  if (s.includes('gak melakukan') || s.includes('libur') || s.includes('istirahat')) {
    return 'rest'
  }
  return 'ok'
}

export function shortStatus(status: string) {
  const s = status.toLowerCase()
  if (!s) return 'Belum'
  if (s.includes('tercapai') && !s.includes('tidak')) return 'Tercapai'
  if (s.includes('tidak') || s.includes('gak selesai')) return 'Tidak'
  if (s.includes('gak melakukan') || s.includes('libur')) return 'Libur'
  return status
}
