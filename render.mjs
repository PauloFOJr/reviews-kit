import { readFileSync, writeFileSync } from 'node:fs';

const [jsonPath, htmlPath, layout = 'list'] = process.argv.slice(2);
const reviews = JSON.parse(readFileSync(jsonPath, 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
const nota = (r) => Math.max(1, Math.min(5, Number(r.estrelas) || 5));
const mes = (s, lang) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { month: 'long', year: 'numeric' }) : '';
};
const iniciais = (n) => { const p = String(n).trim().split(/\s+/); return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const sub = (r) => [r.cargo || r.detalhe, mes(r.data, r.lang)].filter(Boolean).join(' · ');

const cardCarousel = (r) => `<figure class="rcard"${r.lang && r.lang !== 'pt' ? ` lang="${esc(r.lang)}"` : ''}>
  <div class="stars" role="img" aria-label="${nota(r)} de 5 estrelas">${STAR.repeat(nota(r))}</div>
  <blockquote class="rtext">“${esc(r.texto)}”</blockquote>
  <figcaption><span class="avatar" aria-hidden="true">${esc(iniciais(r.nome))}</span><span><b>${esc(r.nome)}</b>${sub(r) ? `<br>${esc(sub(r))}` : ''}</span></figcaption>
</figure>`;

const cardList = (r) => `<li class="depoimento">
  <div class="depoimento__estrelas" role="img" aria-label="${nota(r)} de 5 estrelas">${STAR.repeat(nota(r))}</div>
  <blockquote>“${esc(r.texto)}”</blockquote>
  <p class="depoimento__autor"><strong>${esc(r.nome)}</strong>${sub(r) ? `<br>${esc(sub(r))}` : ''}</p>
</li>`;

const comTexto = reviews.filter((r) => r.texto && String(r.texto).trim());
const google = reviews.filter((r) => r.fonte === 'google').map((r) => Number(r.estrelas)).filter((n) => n >= 1 && n <= 5);

let resumo = '';
if (google.length) {
  const media = google.reduce((a, b) => a + b, 0) / google.length;
  const txt = media.toFixed(1).replace('.', ',');
  const total = `${google.length} ${google.length === 1 ? 'avaliação' : 'avaliações'}`;
  const [pc, sc, nc] = layout === 'carousel'
    ? ['car-resumo', 'stars', 'b']
    : ['depoimentos__resumo', 'depoimento__estrelas', 'strong'];
  resumo = `<p class="${pc}"><span class="${sc}" role="img" aria-label="Nota ${txt} de 5">${STAR.repeat(Math.round(media))}</span><${nc}>${txt}</${nc}><span>· ${total} no Google</span></p>`;
}

let html = readFileSync(htmlPath, 'utf8');
const trocar = (tag, corpo) => {
  const re = new RegExp(`(<!-- REVIEWS:${tag} -->)[\\s\\S]*?(<!-- /REVIEWS:${tag} -->)`);
  if (!re.test(html)) throw new Error(`Marcador REVIEWS:${tag} não encontrado em ${htmlPath}`);
  html = html.replace(re, (_, a, b) => `${a}\n${corpo}\n${b}`);
};
trocar('SUMMARY', resumo);
trocar('CARDS', comTexto.map(layout === 'carousel' ? cardCarousel : cardList).join('\n'));
writeFileSync(htmlPath, html);