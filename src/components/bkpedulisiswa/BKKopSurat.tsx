import React from 'react';

interface BKKopSuratProps {
  subtitle?: string;
  subtitleClassName?: string;
}

export function printBKReport(elementId: string, title = 'Laporan BK Peduli Siswa - UPT SMP Negeri 7 Pasuruan') {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.print\\:hidden, .no-print, [data-no-print="true"], button').forEach(node => node.remove());

  const origImgs = Array.from(el.querySelectorAll('img'));
  const cloneImgs = Array.from(clone.querySelectorAll('img'));
  cloneImgs.forEach((img, idx) => {
    const resolvedSrc = origImgs[idx]?.src || img.getAttribute('src') || '';
    if (resolvedSrc) {
      img.setAttribute('src', resolvedSrc);
    }
  });

  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(node => node.outerHTML)
    .join('\n');

  const htmlDoc = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${window.location.origin}/" />
    <title>${title}</title>
    ${styleTags}
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      }
      #bk-print-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      .page-break-inside-avoid,
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      img {
        max-width: 100% !important;
      }
    </style>
  </head>
  <body>
    <div id="bk-print-wrapper">${clone.innerHTML}</div>
  </body>
</html>`;

  const existing = document.getElementById('bk-isolated-print-frame');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'bk-isolated-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlDoc);
  doc.close();

  const waitForResources = async () => {
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];

    const linkPromises = links.map(
      link =>
        new Promise<void>(resolve => {
          if (link.sheet) {
            resolve();
            return;
          }
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        })
    );

    const imgPromises = imgs.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    );

    const timeout = new Promise<void>(resolve => setTimeout(resolve, 2500));
    await Promise.race([Promise.all([...linkPromises, ...imgPromises]), timeout]);
  };

  waitForResources().then(() => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Isolated print error, falling back to window.print:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000);
      }
    }, 150);
  });
}

export default function BKKopSurat({
  subtitle,
  subtitleClassName = 'text-slate-700',
}: BKKopSuratProps) {
  return (
    <div className="mb-5">
      <div className="w-full">
        <img
          src="/assets/aistudio/kop_surat_spanju_e20dffe4.png"
          alt="Kop Surat Pemerintah Kota Pasuruan - UPT SMP Negeri 7"
          className="w-full h-auto object-contain mx-auto block"
        />
      </div>
      {subtitle && (
        <p className={`text-center text-[10px] sm:text-xs font-black uppercase tracking-widest mt-2 ${subtitleClassName}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
