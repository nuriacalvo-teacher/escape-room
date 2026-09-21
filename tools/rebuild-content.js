/* =====================================================================
   rebuild-content.js · WORD VAULT
   ---------------------------------------------------------------------
   Rebuilds the question bank from the teacher's own published apps.
   Run it when one of those apps gets new exercises:

     git clone --depth 1 https://github.com/nuriacalvo-teacher/irregular-verbs
     git clone --depth 1 https://github.com/nuriacalvo-teacher/present-tenses
     git clone --depth 1 https://github.com/nuriacalvo-teacher/battles
     git clone --depth 1 https://github.com/nuriacalvo-teacher/sentence-formation
     git clone --depth 1 https://github.com/nuriacalvo-teacher/habits
     node rebuild-content.js            # writes content.json

   The file it writes is the same content.json the game reads at start-up,
   so uploading it to the repository is all that is needed.
   ===================================================================== */
const fs=require('fs');
function grab(file,name,open){
  const html=fs.readFileSync(file,'utf8');
  const i=html.indexOf('const '+name);
  const start=html.indexOf(open,i);
  const close=open==='['?']':'}';
  let d=0,end=-1,inStr=null,prev='';
  for(let k=start;k<html.length;k++){
    const c=html[k];
    if(inStr){ if(c===inStr&&prev!=='\\') inStr=null; }
    else if(c==='"'||c==="'"||c==='`') inStr=c;
    else if(c===open) d++;
    else if(c===close){ d--; if(d===0){end=k;break;} }
    prev=(prev==='\\'&&c==='\\')?'':c;
  }
  return eval('('+html.slice(start,end+1)+')');
}
const topics=grab('battles/index.html','TOPICS','[');
const ptMods=grab('present-tenses/index.html','MODULE_DEFS','[');
const ivMods=grab('irregular-verbs/index.html','MODULE_DEFS','[');
const VERBS=grab('irregular-verbs/index.html','VERBS','{');
const sfMods=grab('sentence-formation/index.html','MODULES','[');
const hbMods=grab('habits/index.html','MODULES','[');
const TENSE={ps:'Present Simple',pc:'Present Continuous',pp:'Present Perfect',ppc:'Present Perfect Continuous'};

const items=[];const add=o=>items.push(o);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ===== ROOM 1 · THE VAULT OF VERBS (irregular verbs) ===== */
const IV_LV=[[1,4],[1,4],[2,5],[3,6],[3,6]];
ivMods.forEach((m,mi)=>{
  const lv=IV_LV[mi];
  m.verbs.forEach(v=>{
    const d=VERBS[v]; if(!d) return;
    const past=d[1][0], part=d[2][0];
    // multiple choice: past simple
    const wrongs=[v+'ed', part!==past?part:v+'t', (VERBS[m.verbs[(m.verbs.indexOf(v)+7)%m.verbs.length]]||[,[v+'d']])[1][0]];
    const opts=[past,...wrongs.filter((w,i,a)=>w!==past&&a.indexOf(w)===i)].slice(0,4);
    if(opts.length===4) add({r:'verb',t:'mcq',q:'What is the PAST SIMPLE of “'+v+'”?',o:opts,em:'⚡',
      tip:cap(v)+' – '+d[1].join(' / ')+' – '+d[2].join(' / '),lv,sub:'Irregular verbs'});
    // three forms typed
    add({r:'verb',t:'forms',q:v,a:[d[1],d[2]],em:'🔱',tip:cap(v)+' – '+d[1].join(' / ')+' – '+d[2].join(' / '),lv,sub:'Base · Past · Participle',w:past});
  });
  (m.s||[]).forEach(s=>{
    const [verb,kind,text,alt]=s;
    const d=VERBS[verb]; if(!d) return;
    const answers=alt&&alt.length?alt:(kind==='ps'?d[1]:d[2]);
    add({r:'verb',t:'gap',q:text,a:answers,hint:verb,em:kind==='ps'?'🕰️':'✅',
      tip:(kind==='ps'?'Past simple of ':'Past participle of ')+'“'+verb+'”: '+answers.join(' / '),lv,sub:kind==='ps'?'Past simple':'Present perfect'});
  });
});

/* ===== ROOM 2 · THE TIME LAB (present tenses) ===== */
const PT_RULE={
 ps:'Present Simple — routines, general truths and timetables. He/she/it takes -s; negatives and questions use do/does + base form.',
 pc:'Present Continuous — am/is/are + -ing for what is happening now or around now.',
 pp:'Present Perfect — have/has + past participle: a past action with a present result (ever, never, just, already, yet).',
 ppc:'Present Perfect Continuous — have/has been + -ing: how long an action has been going on (for / since).',
 vs:'Stative verbs (like, know, want, believe, belong…) are not normally used in continuous tenses.',
 master:'Mixed present tenses — read the time expression: it tells you which tense to use.'};
const PT_LV={ps:[2,5],pc:[2,5],pp:[3,6],ppc:[3,6],vs:[4,6],master:[5,6]};
const PT_NAME={ps:'Present Simple',pc:'Present Continuous',pp:'Present Perfect',ppc:'Present Perfect Continuous',vs:'Stative Verbs',master:'Mixed Tenses'};
ptMods.forEach(m=>{
  (m.mcq||[]).forEach(q=>add({r:'tense',t:'mcq',q:q.q,o:q.options,tip:PT_RULE[m.id],lv:PT_LV[m.id],sub:PT_NAME[m.id],em:'⏳'}));
  (m.gaps||[]).forEach(g=>add({r:'tense',t:'gap',q:g.text,a:g.answers,hint:g.hint,tip:PT_RULE[m.id],lv:PT_LV[m.id],sub:PT_NAME[m.id],em:'🧪'}));
});

/* ===== ROOM 3 · THE WORD LIBRARY (vocabulary) ===== */
topics.forEach(t=>{
  t.qs.forEach(q=>add({r:'vocab',t:'mcq',q:q[0],o:q[1],em:q[2],tip:q[3],lv:[2,5],w:q[1][0],sub:t.name}));
  (t.hard||[]).forEach(q=>add({r:'vocab',t:'mcq',q:q[0],o:q[1],em:q[2],tip:q[3].replace(/^B2:\s*/,''),lv:[4,6],w:q[1][0],sub:t.name+' · B2'}));
});

/* ===== ROOM 4 · THE SENTENCE FORGE (word order) ===== */
const SF_LV={affirmative:[2,5],negative:[2,5],yes_no_questions:[3,6],wh_questions:[4,6]};
const SF_KIND={aff:'Affirmative',neg:'Negative',yn:'Yes/No question',wh:'Wh- question'};
sfMods.forEach(m=>{
  m.bank.forEach(s=>{
    if(!s.m) return;
    const words=s.m.replace(/[?.!]+$/,'').split(/\s+/);
    if(words.length<4||words.length>12) return;
    add({r:'order',t:'order',q:s.m,a:[s.m],em:m.type==='wh'?'❓':(m.type==='yn'?'🔎':(m.type==='neg'?'🚫':'🧱')),
      tip:(TENSE[s.t]||'')+(s.use?' · '+s.use:''),lv:SF_LV[m.id],sub:SF_KIND[m.type]+' · '+(TENSE[s.t]||'')});
  });
});

/* ===== ROOM 5 · THE HABIT CHAMBER (used to / usually) ===== */
const HB_RULE={
 used_to_past:'used to + infinitive = a past habit that does not happen any more. After didn’t we write “use to” (no -d).',
 usually_present:'usually / normally + present simple = a habit in the present.',
 be_used_to:'be used to + -ing (or + noun) = to be accustomed to something.',
 get_used_to:'get used to + -ing = the process of becoming accustomed to something.',
 master_habits:'Check the structure: used to + infinitive · be/get used to + -ing.'};
const HB_LV={used_to_past:[1,4],usually_present:[1,4],be_used_to:[3,6],get_used_to:[3,6],master_habits:[4,6]};
const HB_NAME={used_to_past:'Used to',usually_present:'Usually + present',be_used_to:'Be used to',get_used_to:'Get used to',master_habits:'Habits · mixed'};
hbMods.forEach(m=>{
  (m.questions||[]).forEach(q=>{
    const correct=q.options[q.answer];
    const o=[correct,...q.options.filter((_,i)=>i!==q.answer)];
    add({r:'habit',t:'mcq',q:q.q,o,tip:HB_RULE[m.id],lv:HB_LV[m.id],sub:HB_NAME[m.id],em:'🔁'});
  });
});

/* ===== stats ===== */
const by={};items.forEach(i=>{by[i.r+'/'+i.t]=(by[i.r+'/'+i.t]||0)+1});
console.log(by);console.log('TOTAL',items.length);
fs.writeFileSync('content.json',JSON.stringify({name:'Rebuilt bank',version:1,updated:new Date().toISOString().slice(0,10),items},null,0));
console.log('content.json written ·',fs.statSync('content.json').size,'bytes');
