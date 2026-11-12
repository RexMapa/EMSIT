import fs from 'node:fs';
const example=fs.readFileSync('public/services/data-entry.html','utf8');
const contactPattern=/<section class="service-contact"[\s\S]*?<\/section>/;
const sample=example.match(contactPattern)[0];
const generic=sample.replaceAll('data entry','staffing').replace('data-service="Data entry"','data-service="Staffing"');
const process=fs.readFileSync('scripts/onboarding-section.html','utf8');
const files=['index.html','contact.html','hiring.html',...fs.readdirSync('public/services').map(file=>'services/'+file)];
for(const file of files){
 const path='public/'+file;let html=fs.readFileSync(path,'utf8');
 const existing=html.match(contactPattern)?.[0];
 html=html.replace(contactPattern,'');
 html=html.replace('</main>',(existing||generic)+'</main>');
 if(!html.includes('href="/service-pages.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/service-pages.css"></head>');
 if(!html.includes('src="/inquiry.js"'))html=html.replace('</head>','<script defer src="/inquiry.js"></script></head>');
 if(file==='index.html'||file.startsWith('services/')){
  html=html.replace(/<section class="(?:process section onboarding-process|service-process)"[^>]*>[\s\S]*?<\/section>/,process);
  if(!html.includes('href="/sections.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/sections.css"></head>');
  if(!html.includes('href="/onboarding.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/onboarding.css"></head>');
  if(!html.includes('src="/onboarding.js"'))html=html.replace('</head>','<script defer src="/onboarding.js"></script></head>');
 }
 fs.writeFileSync(path,html);
}
console.log('Placed inquiry forms last on all 17 public pages and synchronized homepage process.');
