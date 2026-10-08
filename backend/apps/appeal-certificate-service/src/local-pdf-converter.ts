import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function convertToPdfLocal(inputPath: string, outputPath: string): void {
  if (process.platform === 'win32') {
    const psScript = `
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $doc = $word.Documents.Open('${inputPath}')
      $doc.SaveAs([ref] '${outputPath}', [ref] 17)
      $doc.Close()
      $word.Quit()
    `;
    const scriptPath = join(tmpdir(), `convert-${Date.now()}.ps1`);
    writeFileSync(scriptPath, psScript);
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'ignore' });
    } finally {
      unlinkSync(scriptPath);
    }
  } else {
    throw new Error('Local conversion fallback is only supported on Windows with MS Word installed.');
  }
}
