import { PDFDocument, PDFPage } from 'pdf-lib';
import * as libre from 'libreoffice-convert';
import PizZip from 'pizzip';
import { CertificateRendererService } from '../../../apps/appeal-certificate-service/src/certificate-renderer.service';
import { CertificateTemplateEntity } from '../../../apps/appeal-certificate-service/src/entities';
jest.setTimeout(30000);
jest.mock('libreoffice-convert', () => ({convertWithOptions: jest.fn()}));
describe('CertificateRendererService conversion and exact scores', () => {
 afterEach(() => jest.restoreAllMocks());
 it.each(['DDC Uchen', 'DDC Joyig'])('uses %s without clamping standards or rounding the overall', async font => {
  const drawLine=jest.spyOn(PDFPage.prototype,'drawLine');
  const drawText=jest.spyOn(PDFPage.prototype,'drawText');
  const drawRectangle=jest.spyOn(PDFPage.prototype,'drawRectangle');
  const blank=await PDFDocument.create();blank.addPage([540,779.76]);const pdf=Buffer.from(await blank.save());
  const convert=jest.mocked(libre.convertWithOptions).mockReset().mockImplementation((_doc,_format,_filter,_options,callback)=>callback(null,pdf));
  const bytes=await new CertificateRendererService().render(Object.assign(new CertificateTemplateEntity(),{dzongkhaFont:font,signatoryName:'Director General',chiefExecutiveName:'Chief Executive',testOnly:true}),{
   certificateNumber:'DSTS-2026-QA',holderName:'Wangchuk Dema',holderNameDz:font==='DDC Uchen'?'བཀྲ་ཤིས་':null,registrationNumber:'ཁ-༢༦-༡༠༡',cid:'11111111111',dateOfBirth:new Date('1990-01-01'),examDate:new Date('2026-10-01'),issuedAt:new Date('2026-10-09'),validUntil:new Date('2028-10-09'),scores:{WRITING:50,READING:48,LISTENING:41,SPEAKING:34},skillStandards:{WRITING:10,READING:9,LISTENING:7,SPEAKING:6},overallScore:'8.25',bandLabel:'Standard 8.25',cefrLevel:null,verificationUrl:'http://example.test/verify-certificate/signed-token'
  });
  expect(convert).toHaveBeenCalledWith(expect.any(Buffer),'pdf',undefined,{fileName:'certificate.docx',execOptions:{timeout:30000}},expect.any(Function));
  const xml=new PizZip(convert.mock.calls[0][0]).file('word/document.xml')!.asText();expect(xml).not.toContain('</w:t></w:p>');expect(xml).toContain('Wangchuk Dema');expect(xml).toContain('8.25');expect(xml).toContain('༡༠.༠༠');expect(xml).toContain('༨.༢༥');expect(xml).toContain(font==='DDC Uchen'?'བཀྲ་ཤིས་':'དབང་ཕྱུག་ སྒྲོལ་མ་');expect(xml).toContain('<w:t>until</w:t>');expect(xml).not.toContain('tilL');expect(xml).toContain(font);expect(xml).not.toContain('Microsoft Himalaya');
  const tibetanRuns=(xml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g)??[]).filter(run=>/[\u0F00-\u0FFF]/.test(run));
  const dstsParagraph=xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)!.find(p=>/<w:t\b[^>]*>ཁ<\/w:t>/.test(p))!;
  expect(dstsParagraph).toBeDefined();
  for (const label of ['Name','ID No.','Date of Birth','DSTS No.','Date of Examination']) {
    const paragraph=xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)!.find(p=>[...p.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map(m=>m[1]).join('').trim()===label)!;
    expect(paragraph.match(/<w:framePr\b[^>]*\/>/)![0]).toContain('w:x="540"');
  }
  expect([...dstsParagraph.matchAll(/<w:t\b[^>]*>(.*?)<\/w:t>/g)].map(m=>m[1]).join('')).toBe('ཁ-༢༦-༡༠༡');
  expect(tibetanRuns.length).toBeGreaterThan(30);
  for(const run of tibetanRuns) expect(run).toContain('w:cs="'+font+'"');
  const overallLabel=xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)!.find(p=>p.includes('སྤྱིའི་གནས་ཚད།'))!;
  expect(overallLabel).toContain('w:fill="FFFFFF"');expect(overallLabel).toContain('w:color w:val="00B050"');expect(overallLabel).toContain('w:sz w:val="28"');
  expect(drawLine).toHaveBeenCalledWith(expect.objectContaining({start:{x:100,y:562.36},end:{x:356,y:562.36},thickness:2}));
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  expect(drawRectangle).not.toHaveBeenCalledWith(expect.objectContaining({x:409,y:668,width:106,height:91}));
  expect(drawRectangle).toHaveBeenCalledWith(expect.objectContaining({x:48,y:679,width:74,height:77}));
  const overlays=drawText.mock.calls.map(([text])=>text);expect(overlays).not.toContain('Director General');expect(overlays).not.toContain('Chief Executive');
 });
});

describe('certificate PDF render cache', () => {
 it('shares identical pending renders but invalidates when certificate inputs change', async () => {
  const renderer=new CertificateRendererService();
  const fresh=jest.spyOn(renderer as unknown as {renderFresh:()=>Promise<Buffer>},'renderFresh').mockResolvedValue(Buffer.from('%PDF'));
  const template={id:'qa-template'} as CertificateTemplateEntity;
  const certificate={certificateNumber:'QA-CERT',photo:null} as never;
  await Promise.all([renderer.render(template,certificate),renderer.render(template,certificate)]);
  expect(fresh).toHaveBeenCalledTimes(1);
  await renderer.render(template,{certificateNumber:'QA-CERT',photo:'changed'} as never);
  expect(fresh).toHaveBeenCalledTimes(2);
  await renderer.render({ ...template, signatureImageData: Buffer.from('updated-signature') } as CertificateTemplateEntity, certificate);
  expect(fresh).toHaveBeenCalledTimes(3);
  fresh.mockRestore();
 });
 it('does not cache a failed render', async () => {
  const renderer=new CertificateRendererService();
  const fresh=jest.spyOn(renderer as unknown as {renderFresh:()=>Promise<Buffer>},'renderFresh').mockRejectedValueOnce(new Error('Converter failed')).mockResolvedValue(Buffer.from('%PDF'));
  await expect(renderer.render({} as CertificateTemplateEntity,{} as never)).rejects.toThrow('Converter failed');
  await expect(renderer.render({} as CertificateTemplateEntity,{} as never)).resolves.toEqual(Buffer.from('%PDF'));
  expect(fresh).toHaveBeenCalledTimes(2);fresh.mockRestore();
 });
});
