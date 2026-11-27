/* Unit page behavior: section tabs (notes A to F plus the quiz), reveal answers,
   saved checklists, common mix-ups drawn from the unit data, and quiz buttons.
   Views are addressed by hash: #a to #f for notes, #quiz for the quiz. */
(function(){
"use strict";
var U=window.UNIT;
function $(s,root){return (root||document).querySelector(s);}
function $$(s,root){return Array.prototype.slice.call((root||document).querySelectorAll(s));}
var store={get:function(k){try{return localStorage.getItem(k);}catch(e){return null;}},set:function(k,v){try{localStorage.setItem(k,v);}catch(e){}}};

function show(id){
  var views=$$(".view");if(!views.some(function(v){return v.id==="view-"+id;}))id=views[0].id.replace("view-","");
  views.forEach(function(v){v.hidden=v.id!=="view-"+id;});
  $$(".sec-tabs a").forEach(function(a){var on=a.getAttribute("href")==="#"+id;a.classList.toggle("on",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");if(on&&a.scrollIntoView)a.scrollIntoView({block:"nearest",inline:"center"});});
}
function route(){show((location.hash||"").replace("#","")||"a");}

function setup(){
  /* common mix-ups from the unit data */
  $$(".mixups[data-sec]").forEach(function(box){
    var list=(U.mistakes||{})[box.dataset.sec]||[];
    box.innerHTML=list.map(function(m){return '<div class="mistake"><span class="think">People often think:</span> '+m.think+' <span class="actually">Actually:</span> '+m.actually+'</div>';}).join("");
  });
  /* reveal answers */
  $$(".check-q").forEach(function(q){
    var btn=$(".reveal-btn",q),ans=$(".check-a",q);if(!btn||!ans)return;
    ans.hidden=true;var lbl=btn.textContent;
    btn.addEventListener("click",function(){ans.hidden=!ans.hidden;btn.textContent=ans.hidden?lbl:"Hide";btn.setAttribute("aria-expanded",String(!ans.hidden));});
  });
  /* saved checklists */
  $$("ul.checklist[data-key]").forEach(function(ul){
    var key="p4e:"+ul.dataset.key,saved={};
    try{saved=JSON.parse(store.get(key)||"{}");}catch(e){}
    $$("input[type=checkbox]",ul).forEach(function(cb,i){
      cb.checked=!!saved[i];
      cb.addEventListener("change",function(){saved[i]=cb.checked;store.set(key,JSON.stringify(saved));});
    });
  });
  /* quiz buttons inside notes */
  $$("[data-quiz]").forEach(function(b){
    b.addEventListener("click",function(){
      var parts=b.dataset.quiz.split(":");
      location.hash="quiz";
      if(window.IntroQuiz)window.IntroQuiz.start(parts[0],parts[1]);
      var c=document.getElementById("view-quiz");if(c)c.scrollIntoView({block:"start"});
    });
  });
  window.addEventListener("hashchange",route);
  route();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();
