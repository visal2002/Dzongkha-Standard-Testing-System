import { describe, it, expect } from 'vitest';
import { searchCertificates } from './certificateSearch';
const rows = [
 {id:'old',holderName:'Old Holder',cid:'11111111111',testTakerUserId:'USER-OLD',registrationNumber:'REG-OLD',certificateNumber:'CERT-OLD',issuedAt:'2026-01-01'},
 {id:'new',holderName:'New Holder',cid:'22222222222',testTakerUserId:'USER-NEW',issuedAt:'2026-10-09'},
 {id:'invalid',issuedAt:null},
];
describe('certificate search and newest-first ordering',()=>{
 it('searches by CID and case-insensitive User ID',()=>{
  expect(searchCertificates(rows,'22222222222').map(c=>c.id)).toEqual(['new']);
  expect(searchCertificates(rows,' user-new ').map(c=>c.id)).toEqual(['new']);
 });
 it.each(['old holder','reg-old','cert-old'])('keeps existing search for %s',term=>expect(searchCertificates(rows,term).map(c=>c.id)).toEqual(['old']));
 it('sorts newest first, keeps missing dates last, and does not mutate the input',()=>{
  expect(searchCertificates(rows).map(c=>c.id)).toEqual(['new','old','invalid']);
  expect(rows.map(c=>c.id)).toEqual(['old','new','invalid']);
 });
 it('keeps filtered results in newest-first order',()=>expect(searchCertificates(rows,'user').map(c=>c.id)).toEqual(['new','old']));
});
