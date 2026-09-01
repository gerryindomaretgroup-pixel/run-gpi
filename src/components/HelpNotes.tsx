export function HelpNotes() {
  return (
    <details className="faq">
      <summary>GPS, form, pace, dan banyak orang</summary>

      <h4>GPS</h4>
      <p>
        Rekam di HP saat lari, dengan izin lokasi. Jarak, waktu, dan pace dihitung otomatis. Catatan
        GPS hanya di HP itu, tidak ke spreadsheet, dan tidak kelihatan di HP orang lain.
      </p>
      <p>
        Lupa aktifkan GPS, izin ditolak, atau pakai laptop? Jangan pakai GPS — isi laporan lewat
        Google Form.
      </p>

      <h4>Pace</h4>
      <p>
        Pace GPS = waktu ÷ jarak (menit per km), tampil live dan di{' '}
        <a href="#riwayat-gps">Riwayat GPS</a>. Pace form diisi manual di Google Form.
      </p>

      <h4>Rekap & tren</h4>
      <p>
        Tab Rekap menampilkan jarak form per hari, minggu, bulan, dan tahun, plus grafik tren vs
        periode sebelumnya. GPS HP tidak masuk rekap bersama.
      </p>

      <h4>Banyak orang, tanpa login</h4>
      <p>
        Tidak ada akun. Login tidak dipakai supaya tidak ribet saat pesertanya banyak. Form bisa
        diisi siapa saja; semua jawaban masuk ke <em>satu</em> sheet dan tampil bersama.
      </p>
      <p>
        Tanggal + sesi yang sama diisi lebih dari sekali → jadwal memakai yang{' '}
        <strong>paling baru</strong>. Yang lain tetap di riwayat form.
      </p>
    </details>
  )
}
