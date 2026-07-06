import { FIVE_ELEMENTS, type FiveElement } from '../constants/fiveElements'
import { formatEfficacyTags } from './efficacyTags'
import { resolveSoulCardDisplayHeadlines } from './grimoireFulfillment'

export interface FulfillmentIdCardData {
  magic_title: string
  serial_number: string
  product_name: string
  selected_size: string | null
  element_primary: string
  magic_affiliation: string
  five_elements: string[]
  product_tags: string[]
  chakra: string | null
  resonance_keyword: string | null
  product_image_url: string | null
  magic_birth_date: string | null
  qr_data_url: string | null
}

const LABEL = {
  cardTitle: '\u6c34\u6676\u9b54\u6cd5\u8eab\u5206\u8b49',
  serial: '\u9b54\u6cd5\u7de8\u865f',
  birthDate: '\u51fa\u751f\u65e5\u671f',
  affiliation: '\u9b54\u6cd5\u7cfb\u5225',
  primary: '\u4e3b\u5c6c\u6027',
  efficacy: '\u529f\u6548\u985e\u5225',
  fiveElements: '\u4e94\u884c',
  chakra: '\u8108\u8f2a',
  resonance: '\u5171\u9cf4',
  qrAlt: '\u7c3d\u7d04 QR',
  qrHintScan: '\u6383\u63cf',
  qrHintSign: '\u7c3d\u7f72\u5951\u7d04',
  footer: '\u6676\u523b Crystomade \u00b7 \u9748\u9b42\u5370\u8a18',
  emptyDate: '\u2014',
  year: '\u5e74',
  month: '\u6708',
  day: '\u65e5',
  popupBlocked:
    '\u7121\u6cd5\u958b\u555f\u5217\u5370\u8996\u7a97\uff0c\u8acb\u5141\u8a31\u6b64\u7db2\u7ad9\u7684\u5f48\u51fa\u8996\u7a97\u5f8c\u518d\u8a66',
} as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatBirthDate(isoDate: string | null): string {
  if (!isoDate?.trim()) return LABEL.emptyDate
  const parts = isoDate.trim().slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y} ${LABEL.year} ${Number(m)} ${LABEL.month} ${Number(d)} ${LABEL.day}`
}

function renderFiveElements(elements: string[]): string {
  const active = new Set(elements)
  return FIVE_ELEMENTS.map((el: FiveElement) => {
    const on = active.has(el)
    return `<span class="el${on ? ' on' : ''}">${el}</span>`
  }).join('')
}

const FOIL_TEXT = `
  background: linear-gradient(
    165deg,
    #faf0d4 0%,
    #e8c97a 28%,
    #fff8e8 42%,
    #c9a84c 58%,
    #f0dfa8 78%,
    #b8923f 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
`

const ID_CARD_PRINT_CSS = `
@page {
  size: 90mm 65mm;
  margin: 0;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 90mm;
  height: 65mm;
  font-family: "LXGW WenKai TC", "PingFang TC", "Microsoft JhengHei", serif;
  color: #f0e6d0;
  background: #ebe4d6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.sheet {
  width: 90mm;
  height: 65mm;
  margin: 0;
  padding: 0;
}
.card {
  position: relative;
  width: 90mm;
  height: 65mm;
  padding: 2.4mm 3mm 2.2mm;
  border: 0.35mm solid #c9a84c;
  border-radius: 1.2mm;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201, 168, 76, 0.12) 0%, transparent 70%),
    linear-gradient(168deg, #14100c 0%, #221a12 38%, #1a1410 68%, #100d09 100%);
  box-shadow:
    inset 0 0 0 0.2mm rgba(255, 236, 196, 0.12),
    inset 0 0 3mm rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.card::before {
  content: "";
  position: absolute;
  inset: 0.9mm;
  border: 0.12mm solid rgba(201, 168, 76, 0.28);
  border-radius: 0.8mm;
  pointer-events: none;
}
.card-head {
  position: relative;
  flex-shrink: 0;
  text-align: center;
  padding-bottom: 0.4mm;
}
.card-head::after {
  content: "";
  display: block;
  width: 16mm;
  height: 0.15mm;
  margin: 0.8mm auto 0;
  background: linear-gradient(90deg, transparent, #c9a84c, transparent);
}
.eyebrow {
  margin: 0;
  font-family: "Cinzel", "LXGW WenKai TC", serif;
  font-size: 4.2pt;
  font-weight: 600;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  ${FOIL_TEXT}
}
.title {
  margin: 0.7mm 0 0;
  font-family: "LXGW WenKai TC", "PingFang TC", serif;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.22em;
  ${FOIL_TEXT}
}
.card-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 2.2mm;
  margin-top: 1.4mm;
}
.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.hero {
  display: flex;
  gap: 2mm;
  align-items: flex-start;
}
.thumb {
  width: 11.5mm;
  height: 11.5mm;
  border-radius: 0.6mm;
  border: 0.2mm solid rgba(201, 168, 76, 0.5);
  box-shadow: 0 0 1.2mm rgba(201, 168, 76, 0.2);
  object-fit: cover;
  flex-shrink: 0;
}
.glyph {
  width: 11.5mm;
  height: 11.5mm;
  border-radius: 0.6mm;
  border: 0.2mm solid rgba(201, 168, 76, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12pt;
  ${FOIL_TEXT}
  flex-shrink: 0;
}
.hero-text { min-width: 0; }
.name {
  margin: 0;
  font-size: 7.8pt;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${FOIL_TEXT}
}
.product {
  margin: 0.5mm 0 0;
  font-size: 5.6pt;
  font-weight: 400;
  color: rgba(240, 230, 208, 0.68);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grid {
  margin-top: 1.4mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1mm 2.2mm;
}
.grid .span-2 {
  grid-column: 1 / -1;
}
.grid dt {
  margin: 0;
  font-family: "Cinzel", "LXGW WenKai TC", serif;
  letter-spacing: 0.14em;
  font-size: 4.3pt;
  font-weight: 600;
  color: rgba(212, 184, 116, 0.82);
}
.grid dd {
  margin: 0.25mm 0 0;
  font-size: 5.6pt;
  font-weight: 500;
  color: #f2ebe0;
  line-height: 1.25;
}
.serial {
  font-family: "Cinzel", ui-monospace, monospace;
  font-size: 5.2pt;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: #e8d5a8;
  word-break: break-all;
}
.primary {
  font-size: 7.2pt;
  font-weight: 700;
  letter-spacing: 0.08em;
  ${FOIL_TEXT}
}
.elements-row {
  margin-top: auto;
  padding-top: 1mm;
}
.elements {
  display: flex;
  gap: 1.1mm;
}
.elements .el {
  width: 4.4mm;
  height: 4.4mm;
  border-radius: 50%;
  border: 0.15mm solid rgba(201, 168, 76, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 5.2pt;
  font-weight: 600;
  color: rgba(240, 230, 208, 0.32);
}
.elements .el.on {
  border-color: #d4b874;
  color: #faf0d4;
  background: radial-gradient(circle at 35% 30%, rgba(255, 236, 196, 0.22), rgba(201, 168, 76, 0.1));
  box-shadow: 0 0 1mm rgba(201, 168, 76, 0.35);
}
.extra {
  margin: 0.7mm 0 0;
  font-size: 4.5pt;
  color: rgba(240, 230, 208, 0.52);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qr-block {
  flex-shrink: 0;
  width: 20mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 1.2mm;
  border-left: 0.15mm solid rgba(201, 168, 76, 0.22);
}
.qr-block img {
  width: 17mm;
  height: 17mm;
  display: block;
  background: #fff;
  padding: 0.7mm;
  border-radius: 0.6mm;
  border: 0.2mm solid rgba(201, 168, 76, 0.4);
  box-shadow: 0 0 1.5mm rgba(0, 0, 0, 0.25);
}
.qr-hint {
  margin: 0.9mm 0 0;
  font-size: 4.2pt;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-align: center;
  color: rgba(212, 184, 116, 0.7);
}
.footer {
  position: relative;
  flex-shrink: 0;
  margin: 1.1mm 0 0;
  padding-top: 0.7mm;
  border-top: 0.12mm solid rgba(201, 168, 76, 0.22);
  text-align: center;
  font-family: "Cinzel", "LXGW WenKai TC", serif;
  font-size: 4.3pt;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: rgba(201, 168, 76, 0.72);
}
@media screen {
  body {
    min-height: 65mm;
    padding: 8mm;
    width: auto;
    height: auto;
  }
  .sheet { box-shadow: 0 2mm 10mm rgba(0,0,0,0.18); }
}
`

const PRINT_FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=LXGW+WenKai+TC:wght@400;700&display=swap">'

export function buildFulfillmentIdCardPrintHtml(card: FulfillmentIdCardData): string {
  const thumb = card.product_image_url
    ? `<img class="thumb" src="${escapeHtml(card.product_image_url)}" alt="" />`
    : '<div class="glyph">\u2726</div>'

  const extras = [
    card.chakra ? `${LABEL.chakra} \u00b7 ${escapeHtml(card.chakra)}` : '',
    card.resonance_keyword
      ? `${LABEL.resonance} \u00b7 ${escapeHtml(card.resonance_keyword)}`
      : '',
  ].filter(Boolean)

  const qrBlock = card.qr_data_url
    ? `<div class="qr-block">
        <img src="${card.qr_data_url}" alt="${LABEL.qrAlt}" />
        <p class="qr-hint">${LABEL.qrHintScan}<br>${LABEL.qrHintSign}</p>
      </div>`
    : ''

  const headlines = resolveSoulCardDisplayHeadlines(card.magic_title, card.product_name)

  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${LABEL.cardTitle} \u00b7 ${escapeHtml(headlines.primary)}</title>
${PRINT_FONT_LINK}
<style>${ID_CARD_PRINT_CSS}</style></head><body>
<div class="sheet">
  <article class="card">
    <header class="card-head">
      <p class="eyebrow">CRYSTAL GRIMOIRE</p>
      <h1 class="title">${LABEL.cardTitle}</h1>
    </header>
    <div class="card-body">
      <div class="card-main">
        <div class="hero">
          ${thumb}
          <div class="hero-text">
            <p class="name">${escapeHtml(headlines.primary)}</p>
            ${headlines.secondary ? `<p class="product">${escapeHtml(headlines.secondary)}</p>` : ''}
          </div>
        </div>
        <dl class="grid">
          <div>
            <dt>${LABEL.serial}</dt>
            <dd class="serial">${escapeHtml(card.serial_number)}</dd>
          </div>
          <div>
            <dt>${LABEL.birthDate}</dt>
            <dd>${escapeHtml(formatBirthDate(card.magic_birth_date))}</dd>
          </div>
          <div>
            <dt>${LABEL.affiliation}</dt>
            <dd>${escapeHtml(card.magic_affiliation)}</dd>
          </div>
          <div>
            <dt>${LABEL.primary}</dt>
            <dd class="primary">${escapeHtml(card.element_primary)}</dd>
          </div>
          <div class="span-2">
            <dt>${LABEL.efficacy}</dt>
            <dd>${escapeHtml(formatEfficacyTags(card.product_tags))}</dd>
          </div>
        </dl>
        <div class="elements-row">
          <div class="elements" aria-label="${LABEL.fiveElements}">${renderFiveElements(card.five_elements)}</div>
          ${extras.length > 0 ? `<p class="extra">${extras.join(' \u00b7 ')}</p>` : ''}
        </div>
      </div>
      ${qrBlock}
    </div>
    <p class="footer">${LABEL.footer}</p>
  </article>
</div>
<script>
function printSoon() {
  window.setTimeout(function () { window.print(); }, 300);
}
function waitForAssets() {
  var imgs = document.images;
  var pending = 0;
  for (var i = 0; i < imgs.length; i++) {
    if (!imgs[i].complete) pending++;
  }
  function done() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(printSoon);
    } else {
      printSoon();
    }
  }
  if (pending === 0) {
    done();
    return;
  }
  var left = pending;
  for (var j = 0; j < imgs.length; j++) {
    imgs[j].addEventListener('load', function () {
      left--;
      if (left <= 0) done();
    });
    imgs[j].addEventListener('error', function () {
      left--;
      if (left <= 0) done();
    });
  }
}
window.addEventListener('load', waitForAssets);
</script>
</body></html>`
}

export function openPrintHtmlWindow(html: string): void {
  const w = window.open('', '_blank')
  if (w) {
    w.opener = null
    w.document.open()
    w.document.write(html)
    w.document.close()
    return
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const fallback = window.open(url, '_blank')
  if (!fallback) {
    URL.revokeObjectURL(url)
    window.alert(LABEL.popupBlocked)
    return
  }
  fallback.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
}

export function openFulfillmentIdCardPrint(card: FulfillmentIdCardData): void {
  openPrintHtmlWindow(buildFulfillmentIdCardPrintHtml(card))
}

export function buildFulfillmentQrOnlyPrintHtml(
  card: Pick<FulfillmentIdCardData, 'magic_title' | 'serial_number'> & { qr_data_url: string }
): string {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${LABEL.cardTitle} QR</title>
${PRINT_FONT_LINK}
<style>
@page { margin: 12mm; }
body {
  margin: 0;
  padding: 24px;
  text-align: center;
  font-family: "LXGW WenKai TC", "PingFang TC", "Microsoft JhengHei", serif;
  color: #1a1410;
  background: #f5f0e6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.eyebrow {
  margin: 0 0 6px;
  font-family: "Cinzel", "LXGW WenKai TC", serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.38em;
  color: #9a7b3c;
}
h1 {
  margin: 0 0 10px;
  font-family: "LXGW WenKai TC", serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #2a2018;
}
.name {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #3d3024;
}
.serial {
  margin: 0 0 16px;
  font-family: "Cinzel", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #7a6a52;
}
img {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: block;
  padding: 8px;
  background: #fff;
  border: 1px solid rgba(201, 168, 76, 0.45);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.hint {
  margin: 16px 0 0;
  font-size: 11px;
  line-height: 1.65;
  letter-spacing: 0.06em;
  color: #5c4f3c;
}
</style></head><body>
<p class="eyebrow">CRYSTAL GRIMOIRE</p>
<h1>${LABEL.cardTitle}</h1>
<p class="name">${escapeHtml(card.magic_title)}</p>
<p class="serial">${escapeHtml(card.serial_number)}</p>
<img src="${card.qr_data_url}" alt="${LABEL.qrAlt}" />
<p class="hint">${LABEL.qrHintScan}<br>${LABEL.qrHintSign}<br>\u8cfc\u8cb7\u4eba\u6216\u53cb\u4eba\u767b\u5165\u7686\u53ef<br>\u53cb\u4eba\u7c3d\u7f72\u5f8c\u9b54\u5c0e\u66f8\u8f49\u5165\u5176\u5e33\u6236</p>
<script>
function printSoon(){window.setTimeout(function(){window.print()},300)}
function waitForAssets(){
  var imgs=document.images,pending=0,i;
  for(i=0;i<imgs.length;i++){if(!imgs[i].complete)pending++}
  function done(){
    if(document.fonts&&document.fonts.ready){document.fonts.ready.then(printSoon)}else{printSoon()}
  }
  if(pending===0){done();return}
  var left=pending;
  for(i=0;i<imgs.length;i++){
    imgs[i].addEventListener('load',function(){left--;if(left<=0)done()});
    imgs[i].addEventListener('error',function(){left--;if(left<=0)done()});
  }
}
window.addEventListener('load',waitForAssets);
</script>
</body></html>`
}

export function openFulfillmentQrOnlyPrint(
  card: Pick<FulfillmentIdCardData, 'magic_title' | 'serial_number'> & { qr_data_url: string }
): void {
  openPrintHtmlWindow(buildFulfillmentQrOnlyPrintHtml(card))
}
