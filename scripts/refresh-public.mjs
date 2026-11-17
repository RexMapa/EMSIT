import fs from 'node:fs';
const dir = 'public/';
const read = name => fs.readFileSync(dir + name, 'utf8');
const write = (name, value) => fs.writeFileSync(dir + name, value);
const services = [
  ['bookkeeping','Bookkeeping support','Prepare transaction coding, reconciliations, and month-end schedules for review.'],
  ['invoicing-and-payments','AP / AR support','Enter bills, follow up with vendors, prepare billing and aging reports, and record cash applications.'],
  ['practice-operations','Practice operations','Track client document requests, update your CRM, coordinate appointments, and follow up on open tasks.']
];
const menu = services.map(([slug,title]) => '<a href="/services/'+slug+'">'+title+'</a>').join('');
const supportAreas = [
  ['bookkeeping','Bookkeeping &amp; Accounting','Reconciliations, AP/AR, month-end close'],
  ['invoicing-and-payments','Billing &amp; Receivables','Invoicing, payment posting, follow-up'],
  ['data-processing','Data &amp; Reporting','Recurring reports, dashboards, cleanup'],
  ['product-listing','E-commerce Operations','Listings, orders, inventory'],
  ['property-management','Property &amp; Construction Admin','Leases, work orders, vendor invoices'],
  ['customer-service','Customer &amp; Ops Support','Requests, CRM, scheduling']
];
const cards = supportAreas.map(([slug,title,description]) => '<a class="service-card reveal" href="/services/'+slug+'"><h3>'+title+'</h3><p>'+description+'</p><span class="service-link">Explore service ↗</span></a>').join('');
const wa = '<details class="whatsapp"><summary>WhatsApp</summary><div><strong>WhatsApp coming soon</strong><p>For now, reach our team by email.</p><a href="mailto:contact@emsit.com">contact@emsit.com</a></div></details>';
const icons = ['<path d="M3 5h18v14H3z M3 6l9 7 9-7"/>','<path d="M5 3l4 1 1 5-2 2a14 14 0 0 0 5 5l2-2 5 1 1 4c-1 5-10 0-14-4S1 4 5 3Z"/>','<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'];
for(const file of ['index.html','contact.html','hiring.html',...fs.readdirSync(dir+'services').map(n=>'services/'+n)]){
 let html=read(file);
 html=html.replace(/<div class="nav-dropdown">[\s\S]*?<\/div>/,'<div class="nav-dropdown">'+menu+'</div>')
 .replace(/<a href="\/?#our-team">Our team<\/a>/g,'')
 .replace(/<a href="\/hiring">Hiring form<\/a>/gi,'<a href="/apply">Apply</a><a href="/quotation">Request a quotation</a>')
 .replaceAll('hello@emsit.com','contact@emsit.com')
 .replace(/<script defer src="\/(depth|chat-widget|service-inquiry)\.js"><\/script>/g,'')
 .replace(/<link rel="stylesheet" href="\/(depth|chat|chat-primesphere)\.css">/g,'')
 .replace(/(<a[^>]*href="\/contact#book"[^>]*>)[^<]+/g,'$1Book a consultation ')
 .replaceAll('/contact#message','/contact#book')
 .replace(/<figcaption>[^<]*(?:Photo by|brand guide)[^<]*<\/figcaption>/gi,'')
 .replace(/<div class="story-quote">[\s\S]*?<\/div>/g,'')
 .replace(/(<form class="service-inquiry-form"[\s\S]*?<button[^>]*type="submit"[^>]*>)[^<]+/g,'$1Request a quotation ')
 .replace(/(<section class="service-contact" id="inquire"><div>)[\s\S]*?(<\/div><form)/,'$1<h2>Request a quotation</h2><p>Share the work, tools, and schedule you have in mind. We’ll follow up with pricing for your role.</p>$2')
 .replaceAll('Cost-effective support</h2>','Cost efficiency</h2>')
 .replaceAll('Philippines</option>','Kazakhstan</option>');
 if(!html.includes('/site-refresh.css'))html=html.replace('</head>','<link rel="stylesheet" href="/site-refresh.css"></head>');
 if(!html.includes('class="whatsapp"'))html=html.replace('</body>',wa+'</body>');
 if(file==='index.html'){
  html=html.replace(/<section class="model section"[\s\S]*?<\/section>/,'')
   .replace(/<section class="contact section" id="contact">[\s\S]*?<\/section>/,'')
   .replace(/<div class="service-grid">[\s\S]*?<\/div><p class="services-note">[\s\S]*?<\/p>/,'<div class="service-grid">'+cards+'</div>')
   .replace('Welcome to EMSIT.</h3>','Welcome to <img class="welcome-logo" src="/assets/emsit-navy.svg" alt="EMSIT"></h3>')
   .replace('Let’s scope this role','Request a quotation').replace('id="role-contact" href="/contact"','id="role-contact" href="/quotation"');
 }
 if(file==='contact.html'){
  html=html.replace(/<div class="contact-tabs"[\s\S]*?<div class="contact-panel" role="tabpanel" id="panel-booking" aria-labelledby="tab-booking">/,'<div class="contact-panel" id="book">')
   .replace('Request a discovery call','Book a consultation').replace('Your next chapter,<br>on the calendar.','Book a consultation')
   .replace(/(01 \/ WRITE TO US|02 \/ CALL US|03 \/ FIND US)/g,(label)=>'<svg aria-hidden="true" viewBox="0 0 24 24">'+icons[Number(label.slice(0,2))-1]+'</svg>'+label.slice(5));
 }
 if(file==='hiring.html')html=html.replace('Hiring Form — EMSIT','Request a quotation — EMSIT').replace('Hiring <em>form.</em>','Request a quotation').replace('Submit hiring request','Request a quotation');
 if(file.startsWith('services/'))html=html.replace(/(<section class="service-related">[\s\S]*?<div>)[\s\S]*?(<\/div><\/section>)/,'$1'+services.filter(([s])=>!file.endsWith('/'+s+'.html')).map(([slug,title,desc])=>'<a href="/services/'+slug+'"><h3>'+title+' ↗</h3><p>'+desc+'</p></a>').join('')+'$2');
 write(file,html);
}
write('quotation.html',read('hiring.html'));
const layout=read('quotation.html');
const application='<main class="application-layout"><section><p class="eyebrow">Careers</p><h1>Apply to EMSIT</h1><p>Tell our recruiting team about your experience and the role you’re looking for.</p></section><form class="service-inquiry-form" data-service="Job application"><div class="honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label></div><div class="form-row"><label>First name<input required maxlength="80" name="firstName" autocomplete="given-name"></label><label>Last name<input required maxlength="80" name="lastName" autocomplete="family-name"></label></div><label>Email<input required name="email" type="email" autocomplete="email" maxlength="160"></label><label>Role of interest<input required name="position" maxlength="100"></label><label>Résumé or portfolio link (optional)<input name="resume" type="url" maxlength="250"></label><label>Relevant experience<textarea required name="message" maxlength="2000" rows="5"></textarea></label><button type="submit" class="button primary">Submit application</button><p class="form-status" role="status"></p></form></main>';
write('apply.html',layout.replace(/<main>[\s\S]*?<\/main>/,application).replace('Request a quotation — EMSIT','Apply — EMSIT').replace('/hiring.js','/service-pages.js'));

