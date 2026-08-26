import { writeFileSync } from 'fs';
import { CertificateRendererService } from '../apps/appeal-certificate-service/src/certificate-renderer.service';
import { CertificatePaperSize, CertificateOrientation, CertificateTemplateStatus } from '../apps/appeal-certificate-service/src/entities';

async function main() {
  const renderer = new CertificateRendererService();
  const template: any = {
    id: 'tmpl-1', code: 'DSTS-STANDARD', versionNumber: 1,
    title: 'Dzongkha Standard Testing System Certificate',
    declarationText: 'This is to certify that the holder has completed the Dzongkha Standard Test with the results shown below.',
    signatoryName: 'Chief of Examination', signatoryTitle: 'Chief of Examination',
    chiefExecutiveName: 'Chief Executive', chiefExecutiveTitle: 'Chief Executive, DSTS',
    paperSize: CertificatePaperSize.A4, orientation: CertificateOrientation.Portrait,
    validityMonths: 36, testOnly: false, status: CertificateTemplateStatus.Approved,
  };
  const pdf = await renderer.render(template, {
    certificateNumber: 'DSTS-2025-31122025',
    holderName: 'Sonam Rinchen',
    registrationNumber: 'DSTS-2025-ABCDEF12',
    cid: '11604000933',
    dateOfBirth: new Date(Date.UTC(1998, 10, 1)),
    examDate: new Date(Date.UTC(2025, 11, 31)),
    issuedAt: new Date(),
    validUntil: new Date(Date.UTC(2029, 0, 23)),
    scores: { LISTENING: 6, READING: 5, WRITING: 6, SPEAKING: 6 },
    overallScore: '6',
    bandLabel: 'Independent',
    cefrLevel: 'B1',
    verificationUrl: 'https://dsts.example.gov.bt/public/certificates/verify/abc.def',
  });
  writeFileSync('C:/Users/ADMINI~1/AppData/Local/Temp/claude/d--Dzongkha-Standard-Testing-System/79c95538-1a4e-4c8c-9835-7ddddd6506f7/scratchpad/test-cert.pdf', pdf);
  console.log('done');
}

main().catch((error) => { console.error(error); process.exit(1); });
