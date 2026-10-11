import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, it, expect } from 'vitest';
import DecisionRemarks from './DecisionRemarks';
afterEach(cleanup);
it('explains the actual limits and provides an example and a live character count',()=>{
 function Form(){const [value,setValue]=useState('');return <DecisionRemarks required value={value} onChange={event=>setValue(event.target.value)}/>;}
 render(<Form/>);const field=screen.getByRole('textbox',{name:/Decision remarks/});
 expect(field).toHaveAttribute('maxlength','4000');expect(field).toHaveAttribute('minlength','3');expect(field).toBeRequired();
 expect(field).toHaveAttribute('placeholder',expect.stringContaining('Example: After reviewing'));
 expect(screen.getByText(/Enter at least 3 characters/)).toBeInTheDocument();expect(screen.getByText('0 / 3 minimum characters')).toBeInTheDocument();
 fireEvent.change(field,{target:{value:'Reviewed the speaking recording.'}});expect(screen.getByText('32 / 3 minimum characters')).toBeInTheDocument();
});
it('preserves optional Chief remarks and shows the maximum clearly',()=>{
 render(<DecisionRemarks value={'a'.repeat(4000)} onChange={()=>{}}/>);
 expect(screen.getByText('4,000 / 3 minimum characters')).toBeInTheDocument();expect(screen.getByRole('textbox')).not.toBeRequired();expect(screen.getByText(/Optional; if entered/)).toBeInTheDocument();
});
