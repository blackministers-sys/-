const $ = (id) => document.getElementById(id);
const STORE_KEY = "mindforge.v01.data";
const tasks = [
  {id:"logic-01",category:"ЛОГИКА",title:"Найди закономерность",prompt:"Какое число должно быть следующим? 2 → 6 → 12 → 20 → 30 → ?",options:["36","40","42","44"],answer:2,explanation:"Разности между числами: +4, +6, +8, +10. Следующая разность +12, поэтому 30 + 12 = 42.",skill:"Логика"},
  {id:"business-01",category:"БИЗНЕС-МЫШЛЕНИЕ",title:"Что произошло с рекламой?",prompt:"Бюджет вырос со 100 000 ₽ до 200 000 ₽. Клиентов стало больше: с 200 до 350. Как изменилась стоимость привлечения одного клиента?",options:["Снизилась с 500 ₽ до примерно 286 ₽","Выросла с 500 ₽ до примерно 571 ₽","Не изменилась","Нельзя посчитать"],answer:1,explanation:"До: 100 000 / 200 = 500 ₽ за клиента. После: 200 000 / 350 ≈ 571 ₽. Клиентов стало больше, но каждый клиент в среднем обходится дороже.",skill:"Бизнес"},
  {id:"decision-01",category:"ПРИНЯТИЕ РЕШЕНИЙ",title:"Какого факта не хватает?",prompt:"Ты выбираешь между двумя проектами. В одном обещают выплату 300 000 ₽ с вероятностью 40%, в другом — гарантированные 130 000 ₽. Что нужно уточнить в первую очередь, прежде чем сравнивать варианты?",options:["Какой у проектов логотип","Означает ли 300 000 ₽ прибыль или общую выплату с учётом вложений","Сколько лет существует рынок","Ничего уточнять не нужно"],answer:1,explanation:"Сначала уточняют определения и условия сравнения. Прибыль, выручка и сумма возврата вложений — разные величины. Без этого сравнение может быть ошибочным.",skill:"Решения"}
];
let state = loadState();
let sessionTasks = [...tasks];
let current = 0;
let selected = null;
let checked = false;
let sessionAnswers = [];

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {answers:[],sessions:[],lastDate:null,streak:0}; }
  catch { return {answers:[],sessions:[],lastDate:null,streak:0}; }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
  if(id==="homeScreen") renderHome();
  if(id==="progressScreen") renderProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderHome(){
  $("completed").textContent=state.answers.length;
  const correct=state.answers.filter(a=>a.correct).length;
  $("accuracy").textContent=state.answers.length?Math.round(correct/state.answers.length*100)+"%":"—";
  $("streak").textContent=state.streak||0;
}
function beginTraining(){
  sessionTasks=[...tasks];
  current=0;selected=null;checked=false;sessionAnswers=[];
  renderTask();showScreen("trainingScreen");
}
function renderTask(){
  const t=sessionTasks[current];
  $("questionCounter").textContent=`Задание ${current+1} из ${sessionTasks.length}`;
  $("progressFill").style.width=`${current/sessionTasks.length*100}%`;
  $("categoryLabel").textContent=t.category;
  $("questionTitle").textContent=t.title;
  $("questionPrompt").textContent=t.prompt;
  $("reasonInput").value="";
  $("feedback").hidden=true;$("feedback").className="feedback";
  $("checkBtn").hidden=false;$("nextBtn").hidden=true;
  $("checkBtn").disabled=false;$("checkBtn").innerHTML='Проверить ответ <span>→</span>';
  selected=null;checked=false;
  $("answerOptions").innerHTML="";
  t.options.forEach((option,i)=>{
    const b=document.createElement("button");
    b.className="answer-option";b.textContent=String.fromCharCode(65+i)+". "+option;
    b.addEventListener("click",()=>{if(checked)return;selected=i;document.querySelectorAll(".answer-option").forEach((x,j)=>x.classList.toggle("selected",i===j));});
    $("answerOptions").appendChild(b);
  });
}
function checkAnswer(){
  if(selected===null){$("feedback").hidden=false;$("feedback").className="feedback bad";$("feedback").innerHTML="<strong>Выбери вариант ответа</strong>Не торопись — сначала зафиксируй своё решение.";return;}
  const t=sessionTasks[current], correct=selected===t.answer;
  checked=true;
  document.querySelectorAll(".answer-option").forEach((b,i)=>{b.disabled=true;if(i===t.answer)b.classList.add("selected");});
  const feedback=$("feedback");feedback.hidden=false;feedback.className="feedback "+(correct?"good":"bad");
  feedback.innerHTML=`<strong>${correct?"Верно. Хорошая работа.":"Не совсем. Это возможность научиться."}</strong>${t.explanation}`;
  $("checkBtn").hidden=true;$("nextBtn").hidden=false;
  $("nextBtn").textContent=current===sessionTasks.length-1?"Завершить тренировку →":"Следующее задание →";
  const answer={taskId:t.id,category:t.category,title:t.title,choice:selected,choiceText:t.options[selected],correct,reason:$("reasonInput").value.trim(),date:new Date().toISOString()};
  sessionAnswers.push(answer);state.answers.push(answer);saveState();
}
function nextTask(){
  if(current<sessionTasks.length-1){current++;renderTask();return;}
  finishSession();
}
function finishSession(){
  const correct=sessionAnswers.filter(a=>a.correct).length;
  state.sessions.push({date:new Date().toISOString(),correct,total:sessionAnswers.length});
  const today=new Date().toDateString(), yesterday=new Date(Date.now()-86400000).toDateString();
  const last=state.lastDate;
  if(last!==today) state.streak=last===yesterday?(state.streak||0)+1:1;
  state.lastDate=today;saveState();
  $("progressFill").style.width="100%";
  $("sessionScore").textContent=`${correct}/${sessionAnswers.length}`;
  $("sessionPercent").textContent=Math.round(correct/sessionAnswers.length*100)+"%";
  $("resultSummary").textContent=correct===sessionAnswers.length?"Все ответы верны. Сохрани этот темп — и постепенно усложним задачи.":`Ты ответил правильно на ${correct} из ${sessionAnswers.length}. Разбор ошибок — часть тренировки.`;
  showScreen("resultsScreen");
}
function renderProgress(){
  const total=state.answers.length, correct=state.answers.filter(a=>a.correct).length;
  $("progressCompleted").textContent=total;
  $("progressAccuracy").textContent=total?Math.round(correct/total*100)+"%":"—";
  $("progressSessions").textContent=state.sessions.length;
  const list=$("historyList");list.innerHTML="";
  const recent=[...state.answers].reverse().slice(0,12);
  if(!recent.length){list.innerHTML='<p class="empty-state">Пока нет результатов. Пройди первую тренировку.</p>';return;}
  recent.forEach(a=>{
    const item=document.createElement("article");item.className="history-item";
    item.innerHTML=`<div class="history-item-top"><span>${escapeHtml(a.title)}</span><span class="${a.correct?"correct-tag":"wrong-tag"}">${a.correct?"Верно":"Разобрать"}</span></div><p>${escapeHtml(a.choiceText||"Ответ не указан")}${a.reason?"<br>Ход мысли: "+escapeHtml(a.reason):""}</p>`;
    list.appendChild(item);
  });
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="mindforge-progress.json";a.click();URL.revokeObjectURL(url);
}
$("startBtn").addEventListener("click",beginTraining);
$("checkBtn").addEventListener("click",checkAnswer);
$("nextBtn").addEventListener("click",nextTask);
$("backBtn").addEventListener("click",()=>showScreen("homeScreen"));
$("finishBtn").addEventListener("click",()=>showScreen("homeScreen"));
$("exportBtn").addEventListener("click",exportData);
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));
renderHome();

let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false;});
$("installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true;});
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
