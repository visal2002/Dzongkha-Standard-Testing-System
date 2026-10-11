export function searchCertificates(certificates, search = '') {
  const term = search.trim().toLowerCase();
  const issuedTime = cert => Date.parse(cert.issuedAt) || 0;
  return certificates.filter(cert => [cert.cid, cert.testTakerUserId, cert.userId, cert.holderName, cert.registrationNumber, cert.certificateNumber]
    .some(value => String(value ?? '').toLowerCase().includes(term)))
    .sort((a, b) => issuedTime(b) - issuedTime(a) || Number(b.versionNumber || 0) - Number(a.versionNumber || 0) || String(b.id || '').localeCompare(String(a.id || '')));
}
