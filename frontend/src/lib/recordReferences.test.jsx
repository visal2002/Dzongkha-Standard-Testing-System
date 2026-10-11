import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import RecordReference from '@/components/ui/RecordReference';
import { shortReference, shortReferences, referenceSearch } from './recordReferences';
afterEach(cleanup);
const id='53d74291-1aa3-4953-8524-d6114d43499c';
it('uses the same application reference in components, searches and exports',()=>{
 render(<RecordReference id={id}/>);
 expect(screen.getByText('APP-53D74291')).toHaveAttribute('title',`Full application ID: ${id}`);
 expect(shortReferences([id],'APP')[id]).toBe(shortReference(id));
 expect(referenceSearch(id)).toContain('APP-53D74291');expect(referenceSearch(id)).toContain(id);
});
it('preserves existing human-readable references and handles missing IDs',()=>{
 for(const id of ['APP-2025-0001','RE-10DDE42A','ཀ-༢༦-༠༠༡','DSTS-2026-ABC']) expect(shortReference(id)).toBe(id);
 expect(shortReference(null)).toBe('—');
});
it('shows colliding request references distinctly and retains full IDs',()=>{
 const ids=['12345678-aaaa-4000-8000-000000000001','12345678-bbbb-4000-8000-000000000002'];
 render(<>{ids.map(id=><RecordReference key={id} id={id} prefix="RE" ids={ids}/>)}</>);
 expect(screen.getByText('RE-12345678AA')).toHaveAttribute('title',`Full request ID: ${ids[0]}`);
 expect(screen.getByText('RE-12345678BB')).toBeInTheDocument();
 expect(referenceSearch(ids[0],'RE',ids)).toContain('RE-12345678AA');
});
