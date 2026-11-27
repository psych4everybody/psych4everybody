/* Psych4Everybody quiz engine (adapted from the Intro to Psychology site).
   Each unit page sets window.UNIT (see data/unitN.js) and loads this file.
   Modes: flashcards, vocabulary MCQ, true/false, match'em up, hangman,
   practice questions, common mistakes. Nothing is stored or sent anywhere. */
(function(){
"use strict";
var U=window.UNIT;
var LTR=["A","B","C","D"];
var MODES=[
  {id:"flash",name:"Flashcards",desc:"Flip each card, then rate yourself"},
  {id:"mcq",name:"Vocabulary MCQ",desc:"Pick the term for each definition"},
  {id:"tf",name:"True / False",desc:"Is this the right definition?"},
  {id:"match",name:"Match'em Up",desc:"Pair terms with definitions"},
  {id:"hangman",name:"Hangman",desc:"Spell the term from its definition"},
  {id:"practice",name:"Scenario Questions",desc:"Real-life situations with explanations"},
  {id:"mistakes",name:"Myths and Mix-ups",desc:"What people often get wrong"}
];
var PLANE='<svg class="plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11.6 22 3l-6.4 18-4.2-7.1z" fill="#A2532F"/><path d="M11.4 13.9 22 3" stroke="#FBF8F1" stroke-width="1.3" fill="none"/></svg>';

/* ---------- helpers ---------- */
function $(id){return document.getElementById(id);}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function secKeys(){return Object.keys(U.sections);}
function secName(k){return U.sections[k];}
function withSec(list,k){return (list||[]).map(function(x){var o={};for(var p in x)o[p]=x[p];o.sec=k;return o;});}
function pool(src,topic){
  var keys=topic==="all"?secKeys():[topic];
  return shuffle(keys.reduce(function(acc,k){return acc.concat(withSec(src[k],k));},[]));
}
var REL={};
(U.related||[]).forEach(function(g){g.forEach(function(a){REL[a]=REL[a]||{};g.forEach(function(b){if(a!==b)REL[a][b]=true;});});});
function okPair(a,b){return a!==b&&!(REL[a]&&REL[a][b]);}
function stage(html){$("stage").innerHTML=html;}
function scrollTo(id){var el=$(id);if(el)el.scrollIntoView({block:"nearest",behavior:"smooth"});}
function progress(i,n,left,right){
  var pct=n?Math.min(100,(i/n)*100):0;
  return '<div class="prog-row"><span>'+left+'</span><span>'+(right||"")+'</span></div>'+
    '<div class="prog"><div class="fill" style="width:'+pct+'%"></div><span style="position:absolute;left:'+pct+'%;top:0;">'+PLANE+'</span></div>';
}
function typeClass(t){return t==="Analysis"?"analysis":t==="Application"?"app":"";}
function scoreMsg(p){return p>=80?"Strong work.":p>=60?"Getting there. Keep going.":"Worth another read of the notes. Then try again.";}

/* ---------- state ---------- */
var S={topic:"all",mode:null,list:[],idx:0,score:0,log:[],missed:[],bySec:{},
  hm:{on:false,word:"",shown:[],miss:0,tried:{}},
  m:{sets:[],pos:0,set:[],sel:null,done:false,total:0}};
function logIt(stem,given,correct,ok){S.log.push({stem:stem,given:given,correct:correct,ok:ok});}
function reset(){S.idx=0;S.score=0;S.log=[];S.missed=[];S.bySec={};S.hm.on=false;}

/* ---------- page setup ---------- */
function setup(){
  var ts=$("topicSelect"),ms=$("modeSelect");
  ts.innerHTML='<option value="all">All sections</option>'+secKeys().map(function(k){return '<option value="'+k+'">'+k+'. '+secName(k)+'</option>';}).join("");
  ms.innerHTML=MODES.map(function(m){return '<option value="'+m.id+'">'+m.name+'</option>';}).join("");
  var nTerms=secKeys().reduce(function(s,k){return s+(U.terms[k]||[]).length;},0);
  var nPrac=secKeys().reduce(function(s,k){return s+(U.practice[k]||[]).length;},0);
  $("stats").innerHTML='<span>'+secKeys().length+' sections</span><span>'+nTerms+' key terms</span><span>'+nPrac+' scenario questions</span><span>7 activities</span>';
  $("startBtn").addEventListener("click",function(){start(ts.value,ms.value);});
  home();
  var p=new URLSearchParams(location.search);
  var t=p.get("topic"),m=p.get("mode");
  if(t&&(t==="all"||U.sections[t]))ts.value=t;
  if(m&&MODES.some(function(x){return x.id===m;})){ms.value=m;if(document.getElementById("view-quiz")&&location.hash!=="#quiz")location.hash="quiz";start(ts.value,m);}
}
window.IntroQuiz={start:function(topic,mode){
  if(topic!=="all"&&!U.sections[topic])topic="all";
  $("topicSelect").value=topic;$("modeSelect").value=mode;start(topic,mode);
}};
function home(){
  stage('<div class="placeholder"><h2>Pick a section and an activity</h2><p>Choose from the menus above and press Start, or tap an activity below to use it with the section you have selected.</p>'+
    '<div class="mode-grid">'+MODES.map(function(m){return '<button class="mode-card" data-mode="'+m.id+'"><b>'+m.name+'</b><span>'+m.desc+'</span></button>';}).join("")+'</div></div>');
  Array.prototype.forEach.call(document.querySelectorAll(".mode-card"),function(b){
    b.addEventListener("click",function(){$("modeSelect").value=b.dataset.mode;start($("topicSelect").value,b.dataset.mode);});
  });
}
function start(topic,mode){
  S.topic=topic;S.mode=mode;reset();
  if(mode==="mistakes")return renderMistakes();
  if(mode==="practice"){
    S.list=pool(U.practice,topic);
    if(!S.list.length)return stage('<div class="placeholder"><h2>Practice questions for this section are on the way</h2><p>Try another section, or use the other activities for now.</p></div>');
    return renderPractice();
  }
  S.list=pool(U.terms,topic);
  if(!S.list.length)return stage('<div class="placeholder"><h2>No terms in this section yet</h2></div>');
  if(mode==="flash")renderFlash();
  else if(mode==="mcq")renderMCQ();
  else if(mode==="tf")renderTF();
  else if(mode==="match")startMatch();
  else if(mode==="hangman"){S.hm.on=true;renderHangman();}
}
function topicLabel(){return S.topic==="all"?"All sections":S.topic+". "+secName(S.topic);}
function modeLabel(){var m=MODES.filter(function(x){return x.id===S.mode;})[0];return m?m.name:"";}

/* ---------- flashcards ---------- */
function renderFlash(){
  if(S.idx>=S.list.length)return flashDone();
  var t=S.list[S.idx];
  stage(progress(S.idx,S.list.length,"Card "+(S.idx+1)+" of "+S.list.length,"Tap to flip")+
    '<div class="fc" id="fc" role="button" tabindex="0" aria-label="Flip card"><div class="fc-inner">'+
    '<div class="fc-face fc-front"><div class="face-lbl">Term</div><div class="term">'+t.term+'</div></div>'+
    '<div class="fc-face fc-back"><div class="face-lbl">Definition</div><div class="def">'+t.def+'</div></div></div></div>'+
    '<div class="fc-hint">Say the definition in your head first, then flip and rate yourself honestly.</div>'+
    '<div class="center"><button class="btn btn-ghost" id="fcBack">Previous</button><button class="btn btn-slate" id="fcAgain">Review again</button><button class="btn btn-primary" id="fcGot">Got it</button></div>');
  var fc=$("fc");
  fc.addEventListener("click",function(){fc.classList.toggle("flipped");});
  fc.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();fc.classList.toggle("flipped");}});
  $("fcBack").addEventListener("click",function(){if(S.idx>0){S.idx--;S.log.pop();}renderFlash();});
  $("fcAgain").addEventListener("click",function(){rateFlash(false);});
  $("fcGot").addEventListener("click",function(){rateFlash(true);});
}
function rateFlash(ok){
  var t=S.list[S.idx];
  logIt(t.term,ok?"Got it":"Review again",t.def,ok);
  if(ok)S.score++;else S.missed.push(t);
  S.idx++;renderFlash();
}
function flashDone(){
  var again=S.missed.slice();
  stage('<div class="score"><div class="big">'+S.score+' / '+S.list.length+'</div><div class="lbl">cards marked "Got it"</div>'+
    '<div class="msg">'+(again.length?again.length+" card"+(again.length>1?"s":"")+" to review again":"You know every card in this set.")+'</div>'+
    '<div class="actions" style="justify-content:center;">'+(again.length?'<button class="btn btn-primary" id="fAgain">Review those cards</button>':'')+
    '<button class="btn btn-ghost" id="fAll">Start over</button><button class="btn btn-ghost" id="fPrint">Print summary</button></div></div>');
  if(again.length)$("fAgain").addEventListener("click",function(){S.list=shuffle(again);reset();renderFlash();});
  $("fAll").addEventListener("click",function(){start(S.topic,"flash");});
  $("fPrint").addEventListener("click",printSummary);
}

/* ---------- vocabulary MCQ ---------- */
function renderMCQ(){
  if(S.idx>=S.list.length)return vocabDone();
  var cur=S.list[S.idx];
  var all=pool(U.terms,"all");
  var wrong=shuffle(all.filter(function(t){return okPair(cur.term,t.term);})).slice(0,3);
  var opts=shuffle([cur].concat(wrong));S._opts=opts;S._ans=opts.indexOf(cur);
  stage(progress(S.idx,S.list.length,"Question "+(S.idx+1)+" of "+S.list.length,"Score: "+S.score+" / "+S.idx)+
    '<div class="q-text"><span class="stem-label">Definition</span>'+cur.def+'</div><p class="q-help">Which term matches this definition?</p>'+
    '<div class="opts" id="opts">'+opts.map(function(o,i){return '<button class="opt" data-i="'+i+'"><span class="ltr">'+LTR[i]+'</span><span>'+o.term+'</span></button>';}).join("")+'</div><div id="fb"></div>');
  bindOpts(function(i){
    var ok=i===S._ans;markOpts(i,S._ans);if(ok)S.score++;
    logIt(cur.def,S._opts[i].term,cur.term,ok);S.idx++;
    $("fb").innerHTML='<div class="fb '+(ok?"correct":"incorrect")+'">'+(ok?"Correct.":"Not quite. The answer is "+cur.term+".")+'</div><div class="actions"><button class="btn btn-primary" id="next">Next</button></div>';
    $("next").addEventListener("click",renderMCQ);scrollTo("fb");
  });
}
function bindOpts(fn){
  var done=false;
  Array.prototype.forEach.call(document.querySelectorAll("#opts .opt"),function(b){
    b.addEventListener("click",function(){if(done)return;done=true;fn(parseInt(b.dataset.i,10));});
  });
}
function markOpts(picked,ans){
  Array.prototype.forEach.call(document.querySelectorAll("#opts .opt"),function(b){
    var i=parseInt(b.dataset.i,10);b.disabled=true;
    if(i===ans)b.classList.add(i===picked?"correct":"revealed");
    else if(i===picked)b.classList.add("incorrect");
  });
}

/* ---------- true / false ---------- */
function renderTF(){
  if(S.idx>=S.list.length)return vocabDone();
  var cur=S.list[S.idx];var isTrue=Math.random()<0.5;var shown=cur.def;
  if(!isTrue){
    var others=pool(U.terms,"all").filter(function(t){return okPair(cur.term,t.term);});
    if(others.length)shown=others[0].def;else isTrue=true;
  }
  stage(progress(S.idx,S.list.length,"Question "+(S.idx+1)+" of "+S.list.length,"Score: "+S.score+" / "+S.idx)+
    '<div class="q-text">Is this the correct definition of <strong>'+cur.term+'</strong>?</div><div class="quote">'+shown+'</div>'+
    '<div class="opts row" id="opts"><button class="opt" data-i="0"><span class="ltr">T</span><span>True</span></button><button class="opt" data-i="1"><span class="ltr">F</span><span>False</span></button></div><div id="fb"></div>');
  bindOpts(function(i){
    var ans=isTrue?0:1;var ok=i===ans;markOpts(i,ans);if(ok)S.score++;
    logIt("Is this the definition of "+cur.term+"? "+shown,i===0?"True":"False",isTrue?"True":"False",ok);S.idx++;
    $("fb").innerHTML='<div class="fb '+(ok?"correct":"incorrect")+'">'+(ok?"Correct.":"Not quite. The answer was "+(isTrue?"True":"False")+".")+'</div>'+
      '<div class="why"><strong>'+cur.term+':</strong> '+cur.def+'</div><div class="actions"><button class="btn btn-primary" id="next">Next</button></div>';
    $("next").addEventListener("click",renderTF);scrollTo("fb");
  });
}
function vocabDone(){
  S.hm.on=false;
  var n=S.list.length,p=Math.round((S.score/n)*100);
  stage('<div class="score"><div class="big">'+p+'%</div><div class="lbl">'+S.score+' correct out of '+n+'</div><div class="msg">'+scoreMsg(p)+'</div>'+
    '<div class="actions" style="justify-content:center;margin-top:18px;"><button class="btn btn-primary" id="again">Try again</button><button class="btn btn-ghost" id="pr">Print summary</button></div></div>');
  $("again").addEventListener("click",function(){start(S.topic,S.mode);});
  $("pr").addEventListener("click",printSummary);
}

/* ---------- match'em up ---------- */
function buildSets(){
  var size=Math.min(6,S.list.length),sets=[];
  shuffle(S.list).forEach(function(t){
    var home=null;for(var i=0;i<sets.length;i++){if(sets[i].length<size&&sets[i].every(function(x){return okPair(x.term,t.term);})){home=sets[i];break;}}
    if(home)home.push(t);else sets.push([t]);
  });
  sets.forEach(function(s){
    var cands=shuffle(S.list);
    for(var i=0;i<cands.length&&s.length<size;i++){var c=cands[i];if(s.indexOf(c)<0&&s.every(function(x){return okPair(x.term,c.term);}))s.push(c);}
  });
  return shuffle(sets.filter(function(s){return s.length>1;}));
}
function startMatch(){S.m.sets=buildSets();S.m.pos=0;S.m.total=0;S.score=0;renderMatch();}
function renderMatch(){
  var set=S.m.sets[S.m.pos];S.m.set=set;S.m.sel=null;S.m.done=false;
  var defs=shuffle(set.map(function(t,i){return {i:i,def:t.def};}));
  stage(progress(S.m.pos,S.m.sets.length,"Set "+(S.m.pos+1)+" of "+S.m.sets.length,"Matched: "+S.score+" / "+S.m.total)+
    '<p class="match-help">Tap a term, then tap its definition. You can also drag. Tap a filled definition to clear it.</p>'+
    '<div class="match-grid"><div><div class="col-lbl">Terms</div><div class="m-terms">'+
    set.map(function(t,i){return '<div class="m-term" draggable="true" tabindex="0" role="button" data-t="'+i+'">'+t.term+'</div>';}).join("")+
    '</div></div><div><div class="col-lbl">Definitions</div><div class="m-defs">'+
    defs.map(function(d){return '<div class="m-def" tabindex="0" role="button" data-c="'+d.i+'" data-d="-1"><div class="m-chip" style="display:none"></div><div>'+d.def+'</div><div class="m-answer"></div></div>';}).join("")+
    '</div></div></div><div class="actions" style="justify-content:center;"><button class="btn btn-slate" id="mCheck">Check answers</button></div><div id="fb"></div>');
  Array.prototype.forEach.call(document.querySelectorAll(".m-term"),function(el){
    el.addEventListener("dragstart",function(e){if(S.m.done){e.preventDefault();return;}e.dataTransfer.setData("text/plain",el.dataset.t);el.classList.add("dragging");});
    el.addEventListener("dragend",function(){el.classList.remove("dragging");});
    el.addEventListener("click",function(){pick(parseInt(el.dataset.t,10));});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(parseInt(el.dataset.t,10));}});
  });
  Array.prototype.forEach.call(document.querySelectorAll(".m-def"),function(el){
    el.addEventListener("dragover",function(e){if(!S.m.done){e.preventDefault();el.classList.add("over");}});
    el.addEventListener("dragleave",function(){el.classList.remove("over");});
    el.addEventListener("drop",function(e){e.preventDefault();el.classList.remove("over");if(S.m.done)return;var t=e.dataTransfer.getData("text/plain");if(t!=="")place(parseInt(t,10),el);});
    el.addEventListener("click",function(){defTap(el);});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();defTap(el);}});
  });
  $("mCheck").addEventListener("click",checkMatch);
}
function refreshTerms(){
  var used={};Array.prototype.forEach.call(document.querySelectorAll(".m-def"),function(d){var v=parseInt(d.dataset.d,10);if(v>=0)used[v]=true;});
  Array.prototype.forEach.call(document.querySelectorAll(".m-term"),function(t){var i=parseInt(t.dataset.t,10);t.classList.toggle("placed",!!used[i]);t.classList.toggle("selected",S.m.sel===i);});
}
function pick(i){if(S.m.done)return;S.m.sel=S.m.sel===i?null:i;refreshTerms();}
function defTap(el){if(S.m.done)return;if(S.m.sel!==null)place(S.m.sel,el);else if(parseInt(el.dataset.d,10)>=0)clearDef(el);}
function clearDef(el){el.dataset.d="-1";var c=el.querySelector(".m-chip");c.style.display="none";c.textContent="";el.classList.remove("filled");refreshTerms();}
function place(t,el){
  Array.prototype.forEach.call(document.querySelectorAll(".m-def"),function(d){if(d!==el&&parseInt(d.dataset.d,10)===t)clearDef(d);});
  el.dataset.d=String(t);var c=el.querySelector(".m-chip");c.textContent=S.m.set[t].term;c.style.display="inline-block";el.classList.add("filled");S.m.sel=null;refreshTerms();
}
function checkMatch(){
  if(S.m.done)return;S.m.done=true;$("mCheck").disabled=true;
  var right=0,defs=document.querySelectorAll(".m-def");
  Array.prototype.forEach.call(defs,function(el){
    var d=parseInt(el.dataset.d,10),c=parseInt(el.dataset.c,10),ok=d===c;
    el.classList.remove("filled");el.classList.add(ok?"correct":"incorrect");
    if(ok)right++;else el.querySelector(".m-answer").innerHTML="Correct term: <strong>"+S.m.set[c].term+"</strong>";
    logIt(S.m.set[c].def,d>=0?S.m.set[d].term:"(left blank)",S.m.set[c].term,ok);
  });
  Array.prototype.forEach.call(document.querySelectorAll(".m-term"),function(t){t.classList.remove("selected","placed");});
  S.score+=right;S.m.total+=defs.length;
  var last=S.m.pos>=S.m.sets.length-1;
  $("fb").innerHTML='<div class="fb '+(right===defs.length?"correct":right>defs.length/2?"neutral":"incorrect")+'">'+right+' / '+defs.length+' correct</div><div class="actions"><button class="btn btn-primary" id="next">'+(last?"See results":"Next set")+'</button></div>';
  $("next").addEventListener("click",function(){if(last)matchDone();else{S.m.pos++;renderMatch();}});scrollTo("fb");
}
function matchDone(){
  var p=S.m.total?Math.round((S.score/S.m.total)*100):0;
  stage('<div class="score"><div class="big">'+p+'%</div><div class="lbl">'+S.score+' matched correctly out of '+S.m.total+', across '+S.m.sets.length+' sets</div><div class="msg">'+scoreMsg(p)+'</div>'+
    '<div class="actions" style="justify-content:center;margin-top:18px;"><button class="btn btn-primary" id="again">New sets</button><button class="btn btn-ghost" id="pr">Print summary</button></div></div>');
  $("again").addEventListener("click",function(){start(S.topic,"match");});
  $("pr").addEventListener("click",printSummary);
}

/* ---------- hangman ---------- */
var GALLOWS='<svg class="hm-svg" viewBox="0 0 100 120" stroke="#2F3E4A" stroke-width="3" fill="none" stroke-linecap="round"><line x1="10" y1="115" x2="90" y2="115"/><line x1="30" y1="115" x2="30" y2="5"/><line x1="30" y1="5" x2="70" y2="5"/><line x1="70" y1="5" x2="70" y2="20"/>'+
  '<circle id="h1" cx="70" cy="32" r="12" style="display:none"/><line id="h2" x1="70" y1="44" x2="70" y2="80" style="display:none"/><line id="h3" x1="70" y1="52" x2="54" y2="68" style="display:none"/><line id="h4" x1="70" y1="52" x2="86" y2="68" style="display:none"/><line id="h5" x1="70" y1="80" x2="54" y2="100" style="display:none"/><line id="h6" x1="70" y1="80" x2="86" y2="100" style="display:none"/></svg>';
function renderHangman(){
  if(S.idx>=S.list.length)return vocabDone();
  var t=S.list[S.idx],H=S.hm;
  H.word=t.term.toUpperCase();H.shown=H.word.split("").map(function(c){return /[A-Z]/.test(c)?null:c;});H.miss=0;H.tried={};
  stage(progress(S.idx,S.list.length,"Word "+(S.idx+1)+" of "+S.list.length,"Score: "+S.score)+
    '<div class="hm">'+GALLOWS+'<div class="hm-hint"><strong>Definition:</strong> '+t.def+'</div><div class="hm-word" id="hWord"></div>'+
    '<div class="keys">'+"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(l){return '<button class="hm-key" data-l="'+l+'">'+l+'</button>';}).join("")+'</div><div id="fb" style="width:100%;text-align:center;"></div></div>');
  drawWord();
  Array.prototype.forEach.call(document.querySelectorAll(".hm-key"),function(b){b.addEventListener("click",function(){guess(b.dataset.l);});});
}
function drawWord(){$("hWord").textContent=S.hm.shown.map(function(c){return c===null?"_":c;}).join(" ");}
function guess(l){
  var H=S.hm;if(!H.on||H.tried[l]||H.miss>=6||H.shown.indexOf(null)<0)return;H.tried[l]=true;
  var b=document.querySelector('.hm-key[data-l="'+l+'"]');b.disabled=true;
  if(H.word.indexOf(l)>=0){H.word.split("").forEach(function(c,i){if(c===l)H.shown[i]=l;});b.classList.add("hit");}
  else{H.miss++;b.classList.add("miss");for(var i=1;i<=6;i++){var p=$("h"+i);if(p)p.style.display=i<=H.miss?"block":"none";}}
  drawWord();
  var won=H.shown.indexOf(null)<0,lost=H.miss>=6;
  if(!won&&!lost)return;
  Array.prototype.forEach.call(document.querySelectorAll(".hm-key"),function(k){k.disabled=true;});
  var t=S.list[S.idx];
  if(won)S.score++;else $("hWord").textContent=H.word.split("").join(" ");
  logIt(t.def,won?t.term:"(not solved)",t.term,won);
  $("fb").innerHTML='<div class="fb '+(won?"correct":"incorrect")+'">'+(won?"Solved: ":"The term was: ")+'<strong>'+t.term+'</strong></div><div class="actions" style="justify-content:center;"><button class="btn btn-primary" id="next">Next word</button></div>';
  $("next").addEventListener("click",function(){S.idx++;renderHangman();});
}
document.addEventListener("keydown",function(e){
  if(!S.hm.on||S.mode!=="hangman"||e.ctrlKey||e.metaKey||e.altKey)return;
  var k=(e.key||"").toUpperCase();if(/^[A-Z]$/.test(k))guess(k);
});

/* ---------- practice questions ---------- */
function renderPractice(){
  if(S.idx>=S.list.length)return practiceDone();
  var q=S.list[S.idx],order=shuffle([0,1,2,3]),opts=order.map(function(i){return q.opts[i];});
  S._q=q;S._opts=opts;S._ans=order.indexOf(q.answer);
  stage(progress(S.idx,S.list.length,"Question "+(S.idx+1)+" of "+S.list.length,"Score: "+S.score+" / "+S.idx)+
    '<div class="badges"><span class="badge sec">Section '+q.sec+'</span><span class="badge '+typeClass(q.type)+'">'+q.type+'</span></div>'+
    '<div class="q-text">'+q.q+'</div><div class="opts" id="opts">'+opts.map(function(o,i){return '<button class="opt" data-i="'+i+'"><span class="ltr">'+LTR[i]+'</span><span>'+o+'</span></button>';}).join("")+'</div><div id="fb"></div>');
  bindOpts(function(i){
    var ok=i===S._ans;markOpts(i,S._ans);
    S.bySec[q.sec]=S.bySec[q.sec]||{c:0,n:0};S.bySec[q.sec].n++;
    if(ok){S.score++;S.bySec[q.sec].c++;}else S.missed.push({q:q,picked:S._opts[i],correct:S._opts[S._ans]});
    logIt(q.q,S._opts[i],S._opts[S._ans],ok);S.idx++;
    var last=S.idx>=S.list.length;
    $("fb").innerHTML='<div class="fb '+(ok?"correct":"incorrect")+'">'+(ok?"Correct.":"Not quite. The answer is "+LTR[S._ans]+".")+'</div>'+
      '<div class="why"><strong>Why:</strong> '+q.why+(q.ref?'<span class="ref">'+q.ref+'</span>':'')+'</div><div class="actions"><button class="btn btn-primary" id="next">'+(last?"See results":"Next")+'</button></div>';
    $("next").addEventListener("click",renderPractice);scrollTo("fb");
  });
}
function practiceDone(){
  var n=S.list.length,p=Math.round((S.score/n)*100);
  var rows=Object.keys(S.bySec).sort().map(function(k){var r=S.bySec[k],pc=Math.round((r.c/r.n)*100);
    return '<div class="sec-row"><div>'+k+'. '+secName(k)+'</div><div class="sec-track"><div class="sec-fill" style="width:'+pc+'%"></div></div><div class="sec-num">'+r.c+'/'+r.n+'</div></div>';}).join("");
  var review=S.missed.length?'<div class="review"><div class="sec-h">Review: '+S.missed.length+' to look at again</div>'+S.missed.map(function(m){
    return '<details class="rev"><summary>Section '+m.q.sec+': '+(m.q.q.length>110?m.q.q.slice(0,104).replace(/\s+\S*$/,"")+"...":m.q.q)+'</summary><div class="body"><p>'+m.q.q+'</p><p class="you"><strong>Your answer:</strong> '+m.picked+'</p><p class="right"><strong>Correct answer:</strong> '+m.correct+'</p><p>'+m.q.why+'</p></div></details>';}).join("")+'</div>':'<p class="sub">You answered every question correctly.</p>';
  stage('<div class="score"><div class="big">'+p+'%</div><div class="lbl">'+S.score+' correct out of '+n+'</div><div class="msg">'+scoreMsg(p)+'</div>'+
    '<div class="sub">'+(p>=80?"Your answers show solid understanding.":"Check the sections below, then reread those sections of the notes.")+'</div>'+
    '<div class="sec-break"><div class="sec-h">By section</div>'+rows+'</div>'+
    '<div class="actions" style="justify-content:center;">'+(S.missed.length?'<button class="btn btn-primary" id="retry">Retry the ones I missed</button>':'')+
    '<button class="btn btn-ghost" id="again">Try again</button><button class="btn btn-ghost" id="pr">Print summary</button></div>'+review+'</div>');
  if(S.missed.length)$("retry").addEventListener("click",function(){var qs=S.missed.map(function(m){return m.q;});reset();S.list=shuffle(qs);renderPractice();});
  $("again").addEventListener("click",function(){start(S.topic,"practice");});
  $("pr").addEventListener("click",printSummary);
}

/* ---------- common mistakes ---------- */
function mistakeHTML(m){return '<div class="mistake"><span class="think">People often think:</span> '+m.think+' <span class="actually">Actually:</span> '+m.actually+'</div>';}
function renderMistakes(){
  var keys=S.topic==="all"?secKeys():[S.topic];
  stage('<p class="mistakes-intro">The ideas people most often get wrong in this unit. Read them before you test yourself, and again after.</p>'+
    keys.map(function(k){var list=U.mistakes[k]||[];if(!list.length)return "";return (keys.length>1?'<div class="mistake-h">'+k+'. '+secName(k)+'</div>':'')+list.map(mistakeHTML).join("");}).join("")+
    '<div class="actions" style="justify-content:center;"><button class="btn btn-ghost" id="pr">Print these</button></div>');
  $("pr").addEventListener("click",printSummary);
}

/* ---------- print summary ---------- */
function printSummary(){
  var tot=S.log.length,ok=S.log.filter(function(r){return r.ok;}).length;
  var keys=S.topic==="all"?secKeys():[S.topic];
  var mist=keys.map(function(k){return (U.mistakes[k]||[]).map(function(m){return '<li><b>'+k+':</b> People often think '+m.think+' Actually, '+m.actually+'</li>';}).join("");}).join("");
  var rows=S.log.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td>'+r.stem+'</td><td>'+r.given+'</td><td>'+r.correct+'</td><td>'+(r.ok?"Correct":"Review")+'</td></tr>';}).join("");
  $("printArea").innerHTML='<h1>Psych4Everybody '+U.eyebrow+': '+U.title+'</h1>'+
    '<p>Session summary</p><p>Name: ______________________________ &nbsp; Date: __________________</p>'+
    '<p>Section: '+topicLabel()+' &nbsp;|&nbsp; Activity: '+modeLabel()+(tot&&S.mode!=="mistakes"?' &nbsp;|&nbsp; Score: '+ok+' / '+tot+' ('+Math.round(ok/tot*100)+'%)':'')+'</p>'+
    (rows?'<h2>What you answered</h2><table><tr><th>#</th><th>Question</th><th>Your answer</th><th>Correct answer</th><th>Result</th></tr>'+rows+'</table>':'')+
    (mist?'<h2>Common mistakes for '+(S.topic==="all"?"this unit":"this section")+'</h2><ul>'+mist+'</ul>':'');
  document.body.classList.add("printing-summary");
  var done=function(){document.body.classList.remove("printing-summary");window.removeEventListener("afterprint",done);};
  window.addEventListener("afterprint",done);
  try{window.print();}catch(e){done();}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();
