(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function formatCode(source){
  let out='',i=0,indent=0,paren=0,bracket=0,previous='',lastSourceNewline=false;
  const lineLength=()=>out.length-(out.lastIndexOf('\n')+1);
  const trimEnd=()=>{out=out.replace(/[ \t]+$/,'');};
  const newline=()=>{trimEnd();if(out&&!out.endsWith('\n'))out+='\n';};
  const write=value=>{if(out.endsWith('\n')||!out){out+='  '.repeat(Math.max(0,indent));}out+=value;};
  const quotedEnd=(start,quote)=>{let p=start+1;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]===quote)return p+1;p++;}return p;};
  while(i<source.length){
    const ch=source[i],next=source[i+1];
    if(ch==='\n'){trimEnd();if(out&&(!out.endsWith('\n')||lastSourceNewline))out+='\n';lastSourceNewline=true;i++;continue;}
    if(/\s/.test(ch)){if(!out.endsWith(' ')&&!out.endsWith('\n'))out+=' ';i++;continue;}
    lastSourceNewline=false;
    if(ch==='/'&&next==='/'){let end=source.indexOf('\n',i);if(end<0)end=source.length;write(source.slice(i,end));newline();i=end;previous='comment';continue;}
    if(ch==='/'&&next==='*'){let end=source.indexOf('*/',i+2);end=end<0?source.length:end+2;write(source.slice(i,end));i=end;previous='comment';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){const end=quotedEnd(i,ch);write(source.slice(i,end));i=end;previous='value';continue;}
    const regexMayStart=!previous||/^(=|\(|\[|\{|:|,|;|!|\?|&&|\|\||=>|return|case)$/.test(previous);
    if(ch==='/'&&regexMayStart){let p=i+1,inClass=false;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]==='[')inClass=true;else if(source[p]===']')inClass=false;else if(source[p]==='/'&&!inClass){p++;while(/[a-z]/i.test(source[p]||''))p++;break;}p++;}write(source.slice(i,p));i=p;previous='value';continue;}
    const word=source.slice(i).match(/^[\p{L}_$][\p{L}\p{N}_$]*/u)?.[0];
    if(word){write(word);i+=word.length;previous=word;continue;}
    if(ch==='{'){trimEnd();write(' {');indent++;newline();i++;previous='{';continue;}
    if(ch==='}'){
      newline();indent=Math.max(0,indent-1);write('}');i++;previous='}';
      let look=i;while(/\s/.test(source[look]||''))look++;
      const rest=source.slice(look);
      if(rest.startsWith('else')||rest.startsWith('catch')||rest.startsWith('finally')||rest.startsWith('while'))out+=' ';
      else if(!/^[;,.)\]}]/.test(rest))newline();
      continue;
    }
    if(ch==='('){if(['if','for','while','switch','catch','with'].includes(previous))write(' ');paren++;}
    if(ch===')')paren=Math.max(0,paren-1);if(ch==='[')bracket++;if(ch===']')bracket=Math.max(0,bracket-1);
    if(ch===';'){write(';');i++;previous=';';if(paren===0)newline();continue;}
    if(ch===','){
      write(',');i++;previous=',';
      if(paren===0||lineLength()>92)newline();else out+=' ';
      continue;
    }
    const op=source.slice(i).match(/^(?:===|!==|=>|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\+=|-=|\*=|\/=|\?\.|\*\*|[+*/%<>=!&|?-])/)?.[0];
    if(op){if(lineLength()>94&&(op==='&&'||op==='||'||op==='?'))newline();if(op==='++'||op==='--'||op==='?.')write(op);else{trimEnd();write(` ${op} `);}i+=op.length;previous=op;continue;}
    write(ch);i++;previous=ch;
  }
  return out.trim();
}
function highlightCode(source,state={}){
  const keywords=new Set('const let var function return if else for while do switch case break default new delete typeof class this try catch throw async await'.split(' '));
  const core=new Set('const let var if else for while do switch case break default new delete typeof of in'.split(' '));
  const coreOperators=new Set(['+','-','*','/','%','**','==','!=','===','!==','<','>','<=','>=','&&','||','!']);
  const builtins=new Set('document window Array Object Boolean Number String JSON Math Date Map Set BigInt Symbol parseInt parseFloat'.split(' '));
  const members=new Set('getElementById getElementsByClassName getElementsByTagName querySelector querySelectorAll createElement addEventListener removeEventListener classList append appendChild remove style cssText innerText textContent innerHTML value length map forEach filter find includes push pop shift unshift sort reverse'.split(' '));
  let html='',i=0,previous='';
  const paint=(value,cls)=>`<span class="${cls}">${esc(value)}</span>`;
  const readQuoted=(start,quote)=>{let p=start+1;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]===quote)return p+1;p++;}return p;};
  while(i<source.length){
    const ch=source[i],next=source[i+1];
    if(state.template){let end=i;while(end<source.length){if(source[end]==='\\'){end+=2;continue;}if(source[end]==='`'){end++;break;}end++;}html+=paint(source.slice(i,end),'tok-template');i=end;if(source[end-1]==='`')state.template=false;continue;}
    if(/\s/.test(ch)){html+=ch;i++;continue;}
    if(ch==='/'&&next==='/'){let end=source.indexOf('\n',i);if(end<0)end=source.length;html+=paint(source.slice(i,end),'tok-comment');i=end;previous='comment';continue;}
    if(ch==='/'&&next==='*'){let end=source.indexOf('*/',i+2);end=end<0?source.length:end+2;html+=paint(source.slice(i,end),'tok-comment');i=end;previous='comment';continue;}
    if(ch==='"'||ch==="'"){const end=readQuoted(i,ch);html+=paint(source.slice(i,end),'tok-string');i=end;previous='value';continue;}
    if(ch==='`'){const end=readQuoted(i,'`');html+=paint(source.slice(i,end),'tok-template');i=end;if(source[end-1]!=='`')state.template=true;previous='value';continue;}
    const regexMayStart=!previous||/^(=|\(|\[|\{|:|,|;|!|\?|&&|\|\||=>|return|case)$/.test(previous);
    if(ch==='/'&&regexMayStart){let p=i+1,inClass=false;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]==='[')inClass=true;else if(source[p]===']')inClass=false;else if(source[p]==='/'&&!inClass){p++;while(/[a-z]/i.test(source[p]||''))p++;break;}p++;}html+=paint(source.slice(i,p),'tok-regex');i=p;previous='value';continue;}
    const word=source.slice(i).match(/^[\p{L}_$][\p{L}\p{N}_$]*/u)?.[0];
    if(word){
      let cls='tok-plain';
      if(core.has(word))cls='tok-core';else if(keywords.has(word))cls='tok-keyword';else if(word==='true'||word==='false'||word==='null'||word==='undefined'||word==='NaN')cls='tok-literal';else if(builtins.has(word)||members.has(word))cls='tok-builtin';else if(/^\s*\(/.test(source.slice(i+word.length))||previous==='const'&&/^\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\p{L}_$][\p{L}\p{N}_$]*)\s*=>/u.test(source.slice(i+word.length)))cls='tok-function';
      html+=paint(word,cls);i+=word.length;previous=word;continue;
    }
    const number=source.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?n?/ )?.[0]?.trimEnd();
    if(number){html+=paint(number,'tok-number');i+=number.length;previous='value';continue;}
    const operator=source.slice(i).match(/^(?:===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\?\?|\*\*|\+=|-=|\*=|\/=|\?\.|\?\?|[+*/%<>=!&|?:.,;(){}\[\]-])/ )?.[0]?.trimEnd();
    if(operator){html+=paint(operator,coreOperators.has(operator)?'tok-core':'tok-operator');i+=operator.length;previous=operator;continue;}
    html+=esc(ch);i++;previous=ch;
  }
  return html;
}
function kind(v){return v===null?'null':v===undefined?'undefined':Array.isArray(v)?'array':typeof v;}
function fmt(v){
  if(typeof v==='string')return '"'+v+'"';
  if(v===undefined)return 'undefined';
  if(typeof v==='bigint')return v+'n';
  if(typeof v==='symbol')return v.toString();
  if(typeof v==='function')return 'ƒ()';
  if(typeof v==='object'&&v!==null){try{return JSON.stringify(v);}catch(e){return String(v);}}
  return String(v);
}
function parseAny(raw){
  const s=String(raw).trim();
  if(s==='')return undefined;
  if(s==='null')return null;if(s==='undefined')return undefined;
  if(s==='true')return true;if(s==='false')return false;
  if(s==='NaN')return NaN;if(s==='Infinity')return Infinity;if(s==='-Infinity')return -Infinity;
  if(/^[+-]?\d+n$/.test(s))return BigInt(s.slice(0,-1));
  if(/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s))return Number(s);
  let m=s.match(/^Symbol\((.*)\)$/);if(m)return Symbol(m[1]);
  if(s[0]==='['||s[0]==='{'||s[0]==='"'){
    try{return JSON.parse(s);}catch(e){}
    if(s[0]!=='"'){ // м’який розбір: [a, b] або {a:1} без лапок
      try{
        const fixed=s.replace(/'([^']*)'/g,'"$1"').replace(/("(?:[^"\\]|\\.)*")|([^\s,\[\]{}:"]+)/g,(m,q,w)=>q?q:(/^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)$/.test(w)?w:JSON.stringify(w)));
        return JSON.parse(fixed);
      }catch(e){}
    }
  }
  if(s.length>1&&s[0]==="'"&&s[s.length-1]==="'")return s.slice(1,-1);
  return s;
}
function say(el,text,ok){el.textContent=text;el.className='msg'+(ok===true?' ok':ok===false?' err':'');}
/* ===== page chrome ===== */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');}),{threshold:.06});
$$('.reveal').forEach(el=>io.observe(el));
const bar=$('#bar');
addEventListener('scroll',()=>{const h=document.documentElement;bar.style.width=(scrollY/Math.max(1,h.scrollHeight-innerHeight)*100)+'%';},{passive:true});

/* ===== 08 DOM ===== */
(function(){
  const sb=$('#sandbox'),treeEl=$('#tree'),msg=$('#domMsg');
  sb.innerHTML='<h3>Привіт, DOM!</h3><p>Це звичайний абзац.</p><ul><li>Перший пункт</li><li>Другий пункт</li></ul><button>Кнопка</button>';
  let sel=null,textSel=null,nodes=[],textNodes=[];
  function walk(el,root){
    const idx=nodes.push(el)-1;
    const cls=[...el.classList].map(c=>'.'+c).join('');
    const tag=root?'div#sandbox':el.tagName.toLowerCase()+cls;
    let kids='';
    el.childNodes.forEach(n=>{
      if(n.nodeType===1)kids+=walk(n,false);
      else if(n.nodeType===3&&n.textContent.trim()){
        const textIndex=textNodes.push(n)-1;
        kids+=`<li><span class="tn-text${n===textSel?' sel':''}" data-text-i="${textIndex}">"${esc(n.textContent.trim())}"</span></li>`;
      }
    });
    return `<li><span class="tn${el===sel?' sel':''}" data-i="${idx}">&lt;${esc(tag)}&gt;</span>${kids?'<ul>'+kids+'</ul>':''}</li>`;
  }
  function refresh(){
    nodes=[];textNodes=[];treeEl.innerHTML='<ul>'+walk(sb,true)+'</ul>';
    $$('[data-sel]',sb).forEach(x=>x.removeAttribute('data-sel'));sb.removeAttribute('data-sel');
    if(sel&&sel!==sb)sel.setAttribute('data-sel','');
  }
  const name=el=>el===sb?'контейнер #sandbox':'<'+el.tagName.toLowerCase()+'>';
  function select(el){sel=el;textSel=null;refresh();say(msg,sel?'Обрано '+name(sel):'',true);}
  function selectText(node){sel=null;textSel=node;refresh();say(msg,`Обрано текст: «${node.textContent.trim()}»`,true);}
  sb.addEventListener('click',e=>{e.preventDefault();select(e.target===sb?sb:e.target);});
  treeEl.addEventListener('click',e=>{
    const text=e.target.closest('.tn-text[data-text-i]');
    if(text){selectText(textNodes[+text.dataset.textI]);return;}
    const t=e.target.closest('.tn');if(t)select(nodes[+t.dataset.i]);
  });
  const need=()=>{if(!sel&&!textSel){say(msg,'Спершу обери елемент або текст (клікни на сторінці чи в дереві)',false);return false;}return true;};
  const needElement=()=>{if(!need())return false;if(textSel){say(msg,'Цю дію можна виконати лише з HTML-елементом',false);return false;}return true;};
  function addElement(){
    if(textSel)return say(msg,'Щоб додати елемент, обери тег у DOM-дереві або на сторінці',false);
    const parent=sel||sb,tag=$('#domTag').value,el=document.createElement(tag);
    if(['img','input','hr'].includes(parent.tagName.toLowerCase()))return say(msg,`${name(parent)} не може містити дочірні елементи`,false);
    const labels={p:'Новий абзац',span:'span-текст',li:'Новий пункт',h1:'Новий заголовок',h2:'Новий заголовок',h3:'Новий заголовок',h4:'Новий заголовок',button:'Кнопка',div:'Новий блок',section:'Новий розділ',article:'Нова стаття',strong:'Виділений текст',em:'Курсивний текст',ul:'Новий список',ol:'Нумерований список',label:'Підпис до поля'};
    if(tag==='img'){
      el.src='https://placehold.co/160x100/png?text=DOM';el.alt='Тестове зображення для DOM';el.width=160;el.height=100;
    }else if(tag==='a'){
      el.href='https://example.com/';el.textContent='Тестове посилання';el.target='_blank';el.rel='noopener noreferrer';
    }else if(tag==='input'){
      el.type='text';el.placeholder='Текстове поле';el.value='Приклад input';
    }else if(tag==='button'){
      el.type='button';el.textContent=labels[tag];
    }else if(tag!=='hr')el.textContent=labels[tag]||`Новий елемент <${tag}>`;
    parent.appendChild(el);sel=el;textSel=null;refresh();say(msg,`createElement("${tag}") + appendChild → додано в ${name(parent)}`,true);
  }
  function toggleClass(){if(!needElement())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);const on=sel.classList.toggle('hl');refresh();say(msg,on?'Клас .hl додано':'Клас .hl прибрано',true);}
  function changeStyle(){
    if(!needElement())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);
    const h=Math.floor(Math.random()*360);sel.style.backgroundColor=`hsl(${h} 80% 80%)`;sel.style.color=`hsl(${h} 60% 25%)`;sel.style.borderRadius='8px';sel.style.padding='4px 8px';
    refresh();say(msg,'Стиль змінено напряму через style',true);
  }
  function deleteElement(){
    if(!need())return;
    if(textSel){const content=textSel.textContent.trim();textSel.parentNode.removeChild(textSel);textSel=null;refresh();say(msg,`Текст «${content}» видалено з документа`,true);return;}
    if(sel===sb)return say(msg,'Контейнер видаляти не будемо 🙂',false);const n=name(sel);sel.remove();sel=null;refresh();say(msg,`${n} видалено з документа`,true);
  }
  function changeText(){
    if(!need())return;
    if(textSel){textSel.textContent=$('#domText').value;refresh();say(msg,'Текстовий вузол змінено',true);return;}
    sel.textContent=$('#domText').value;refresh();say(msg,'Текст змінено. Увага: якщо в елемента були діти — вони зникли разом зі старим вмістом',true);
  }
  $('#dAdd').onclick=addElement;$('#dClass').onclick=toggleClass;$('#dStyle').onclick=changeStyle;$('#dDel').onclick=deleteElement;$('#dText').onclick=changeText;
  function find(){
    $$('[data-match]',sb).forEach(x=>x.removeAttribute('data-match'));
    const s=$('#domSel').value.trim();if(!s)return;
    try{const f=sb.querySelectorAll(s);f.forEach(x=>x.setAttribute('data-match',''));say(msg,f.length?`Знайдено елементів: ${f.length} (підсвічено зеленим)`:'Нічого не знайдено — повернуло порожній список',!!f.length);}
    catch(e){say(msg,'SyntaxError: некоректний селектор',false);}
  }
  $('#dFind').onclick=find;
  function selectPreset(e){const chip=e.target.closest('.chip[data-s]');if(!chip)return;$('#domSel').value=chip.dataset.s;find();}
  $$('.chip[data-s]').forEach(c=>c.addEventListener('click',selectPreset));
  const domCode=`// ===== Пошук і зміна елементів =====
// Шукаємо елементи за id, класом або назвою тегу.
const app = document.getElementById("app");
const cards = document.getElementsByClassName("card");
const items = document.getElementsByTagName("li");

// querySelector повертає перший збіг, querySelectorAll — усі збіги.
const firstCard = document.querySelector(".card");
const allCards = document.querySelectorAll(".card");

const status = document.querySelector("#status");
// textContent змінює текст усередині знайденого елемента.
status.textContent = "Готово";

// ===== innerText, textContent та innerHTML =====
const visibleLabel = document.querySelector(".visible-label");
// innerText працює з видимим текстом елемента.
visibleLabel.innerText = "Видимий текст";

const plainMessage = document.querySelector(".plain-message");
// textContent задає текст без HTML-розмітки.
plainMessage.textContent = "Текстовий вміст";

const richMessage = document.querySelector(".rich-message");
// strong позначає важливий текст; за типовими стилями браузера він має напівжирне накреслення.
richMessage.innerHTML = "<strong>HTML-розмітка</strong>";

// ===== Класи та стилі =====
const element = document.querySelector(".card");
// add додає клас, remove знімає його.
element.classList.add("active");
element.classList.remove("muted");
// toggle перемикає клас: додає, якщо його немає, або прибирає, якщо він є.
element.classList.toggle("selected");

// element.style дає доступ до вбудованих стилів елемента: можна змінити окрему властивість.
element.style.backgroundColor = "teal";
// cssText задає всі вбудовані стилі одним CSS-рядком і замінює попередні.
element.style.cssText = "background-color: teal; color: white; padding: 8px;";

// ===== Створення й додавання елементів =====
const list = document.querySelector("#items");
// Створюємо новий li, задаємо йому текст і додаємо в кінець списку.
const item = document.createElement("li");
item.textContent = "Новий пункт";
list.append(item);

// append() приймає вузли й текст, а appendChild() — лише вузол; обидва додають у кінець.
const anotherItem = document.createElement("li");
anotherItem.textContent = "Ще один пункт";
list.appendChild(anotherItem);

// Створюємо зображення, задаємо адресу й альтернативний опис, додаємо в список.
const image = document.createElement("img");
image.src = "https://placehold.co/160x100/png?text=DOM";
image.alt = "DOM";
list.append(image);

// ===== Видалення елемента =====
// Видаляємо щойно створений пункт зі сторінки.
item.remove();`;
  const domDialog=$('#domDialog');
  function showDomCode(){
    const code=formatCode(domCode),lexerState={template:false};
    $('#domCodeSource').innerHTML=code.split('\n').map(line=>`<span class="code-line">${highlightCode(line,lexerState)||' '}</span>`).join('');
    domDialog.showModal();
  }
  $('#openDomCode').addEventListener('click',showDomCode);
  $('#domCodeClose').addEventListener('click',()=>domDialog.close());
  domDialog.addEventListener('click',e=>{if(e.target===domDialog)domDialog.close();});
  refresh();
})();


/* ===== 09 EVENTS ===== */
(function(){
  /* playground */
  const pad=$('#pad'),logEl=$('#evLog');
  const TYPES=['click','dblclick','contextmenu','mouseenter','mouseleave','mousemove','wheel'];
  const counts={},on={click:1,dblclick:1,mouseenter:1,mouseleave:1};
  let lines=[];
  const eventTopics=[
    {id:'basics',marker:'// ===== Події браузера ====='},
    {id:'listeners',marker:'// ===== addEventListener() і removeEventListener() ====='},
    {id:'event-object',marker:'// ===== Об’єкт події: type і target ====='},
    {id:'delegation',marker:'// ===== Делегування подій ====='}
  ];
  const eventCode=`// ===== Події браузера =====
// Подія — сигнал про дію користувача або зміну в браузері.
// Приклади: click, input, change, submit, keydown, pointermove.

// ===== addEventListener() і removeEventListener() =====
const toggleButton = document.querySelector(".toggle-button");

// Обробник можна оголосити звичайною функцією або стрілочною функцією.
function handleClickWithFunction(event) {
  console.log("Клік");
}
const handleClickEvent = event => console.log("Клік");

// Підключаємо стрілочний варіант і передаємо те саме посилання для відписки.
toggleButton.addEventListener("click", handleClickEvent);
toggleButton.removeEventListener("click", handleClickEvent);

// Наступний варіант не спрацює: кожна стрілка тут створює окрему функцію.
// toggleButton.addEventListener("click", () => console.log("Клік"));
// toggleButton.removeEventListener("click", () => console.log("Клік"));

// ===== Об’єкт події: type і target =====
function logEvent(event) {
  // Усі три значення побачиш у вкладці Console (Консоль) інструментів розробника.
  console.log(event.type);         // Назва події: input, change або submit.
  console.log(event.target);       // Елемент, на якому сталася подія.
  console.log(event.currentTarget);// Елемент, на якому зареєстрований цей обробник.
  // Для submit скасовуємо стандартну відправку форми.
  if (event.type === "submit") event.preventDefault();
}

const input = document.querySelector("#submitName");
const form = document.querySelector("#submitDemo");
// Поки друкуєш ім’я: Console покаже "input", поле #submitName, поле #submitName.
input.addEventListener("input", logEvent);
// Після редагування й виходу з поля: "change", #submitName, #submitName.
input.addEventListener("change", logEvent);
// Після натискання «Надіслати»: "submit", кнопка submit, форма #submitDemo.
form.addEventListener("submit", logEvent);

// capture: true викликає обробник на шляху до цілі; за замовчуванням це false.
toggleButton.addEventListener("click", handleClickEvent, { capture: true });
// Те саме коротким записом: третій аргумент true вмикає capture.
// toggleButton.addEventListener("click", handleClickEvent, true);

// ===== Делегування подій =====
const list = document.querySelector("#list");

function handleListClick(event) {
  // closest() шукає найближчий li від цілі кліку (навіть якщо клікнули по span).
  const item = event.target.closest("li");
  // contains() перевіряє, що знайдений li справді всередині саме цього списку.
  if (!item || !list.contains(item)) return;

  // toggle додає клас done для позначення виконаного пункту або знімає його.
  item.classList.toggle("done");
}

// Один обробник на списку спрацьовує і для пунктів, доданих пізніше.
list.addEventListener("click", handleListClick);
`;
  const eventCodeDialog=$('#eventCodeDialog');
  const eventCodeSource=$('#eventCodeSource');
  const eventCodeView=$('#eventCodeView');
  function renderEventCode(){
    const code=formatCode(eventCode),lexerState={template:false};
    $$('#eventCodeTopics [data-event-topic]').forEach(button=>{
      const active=button.dataset.eventTopic==='basics';
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
    eventCodeSource.innerHTML=code.split('\n').map(line=>{
      const topic=eventTopics.find(item=>item.marker===line.trim());
      const anchor=topic?` data-event-anchor="${topic.id}"`:'';
      return `<span class="code-line"${anchor}>${highlightCode(line,lexerState)||' '}</span>`;
    }).join('');
    eventCodeView.scrollTop=0;
  }
  $('#openEventCode').addEventListener('click',()=>{
    renderEventCode();eventCodeDialog.showModal();
  });
  $('#eventCodeTopics').addEventListener('click',e=>{
    const button=e.target.closest('[data-event-topic]');if(!button)return;
    const topic=button.dataset.eventTopic;
    const marker=$(`[data-event-anchor="${topic}"]`,eventCodeSource);
    if(!marker)return;
    $$('#eventCodeTopics [data-event-topic]').forEach(item=>{
      const selected=item===button;
      item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected));
    });
    const top=marker.getBoundingClientRect().top-eventCodeView.getBoundingClientRect().top+eventCodeView.scrollTop;
    eventCodeView.scrollTo({top,behavior:'smooth'});
  });
  let scrollTick=false;
  eventCodeView.addEventListener('scroll',()=>{
    if(scrollTick)return;
    scrollTick=true;
    requestAnimationFrame(()=>{
      scrollTick=false;
      const viewTop=eventCodeView.getBoundingClientRect().top;
      const anchors=$$('[data-event-anchor]',eventCodeSource);
      let current=anchors[0];
      for(const anchor of anchors){
        if(anchor.getBoundingClientRect().top<=viewTop+24)current=anchor;
        else break;
      }
      if(current){
        const active=current.dataset.eventAnchor;
        $$('#eventCodeTopics [data-event-topic]').forEach(item=>{
          const selected=item.dataset.eventTopic===active;
          item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected));
        });
      }
    });
  });
  $('#eventCodeClose').addEventListener('click',()=>eventCodeDialog.close());
  eventCodeDialog.addEventListener('click',e=>{if(e.target===eventCodeDialog)eventCodeDialog.close();});
  $('#evChecks').innerHTML=TYPES.map(t=>`<label class="${on[t]?'on':''}"><input type="checkbox" data-t="${t}" ${on[t]?'checked':''}>${t}<em id="cnt-${t}">0</em></label>`).join('');
  function ripple(e){
    const r=pad.getBoundingClientRect(),s=document.createElement('span');s.className='ripple';
    s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';pad.appendChild(s);setTimeout(()=>s.remove(),700);
  }
  function paintLog(){
    logEl.innerHTML=lines.length?lines.map(l=>`<div><span class="tp">${l.t}</span><span>${esc(l.i)}</span><span class="tm">${l.time}</span></div>`).join(''):'<span class="counter">Подій ще не було…</span>';
  }
  function handler(t){
    return function(e){
      counts[t]=(counts[t]||0)+1;$('#cnt-'+t).textContent=counts[t];
      let info='';
      if(t==='wheel'){e.preventDefault();info='deltaY: '+Math.round(e.deltaY);}
      else{const r=pad.getBoundingClientRect();info=`x: ${Math.round(e.clientX-r.left)}, y: ${Math.round(e.clientY-r.top)}`;if(t==='click'||t==='dblclick'||t==='contextmenu')ripple(e);}
      if(t==='contextmenu'){e.preventDefault();info+=' (меню скасовано)';}
      const time=new Date().toLocaleTimeString('uk-UA');
      if((t==='mousemove'||t==='wheel')&&lines[0]&&lines[0].t===t){lines[0]={t,i:info,time};}
      else{lines.unshift({t,i:info,time});if(lines.length>7)lines.pop();}
      paintLog();
    };
  }
  const hs={};TYPES.forEach(t=>hs[t]=handler(t));
  const listen=(t,add)=>{if(t==='wheel'){if(add)pad.addEventListener(t,hs[t],{passive:false});else pad.removeEventListener(t,hs[t]);}else if(add)pad.addEventListener(t,hs[t]);else pad.removeEventListener(t,hs[t]);};
  Object.keys(on).forEach(t=>listen(t,true));
  function toggleSubscription(e){
    const t=e.target.dataset.t;if(!t)return;
    e.target.parentElement.classList.toggle('on',e.target.checked);
    listen(t,e.target.checked);
  }
  $('#evChecks').addEventListener('change',toggleSubscription);
  paintLog();

  /* inputs */
  let ci=0,cc=0;const nameIn=$('#nameIn');
  function onNameInput(){ $('#cInput').textContent=++ci;$('#echo').textContent=nameIn.value?'Ти вводиш: '+nameIn.value:''; }
  function onNameChange(){ $('#cChange').textContent=++cc; }
  nameIn.addEventListener('input',onNameInput);
  nameIn.addEventListener('change',onNameChange);
  function greet(){
    $('#echo').textContent=nameIn.value.trim()?`👋 Привіт, ${nameIn.value.trim()}!`:'Спершу введи ім’я';
  }
  $('#greetBtn').addEventListener('click',greet);
  function resizeCircle(e){
    const v=+e.target.value,c=$('#circle');c.style.width=c.style.height=v+'px';c.textContent=v;c.style.filter=`hue-rotate(${(v-30)*2}deg)`;
  }
  $('#circR').addEventListener('input',resizeCircle);

  /* submit event */
  const submitForm=$('#submitDemo');let submitCount=0;
  function handleSubmitDemo(e){
    // Зазвичай браузер надсилає дані за адресою форми й показує відповідь сервера.
    // preventDefault() скасовує це стандартне надсилання — результат лишається тут.
    e.preventDefault();
    const name=$('#submitName').value.trim();submitCount++;
    $('#submitResult').textContent=`Форму оброблено для ${name} · submit №${submitCount}. Сторінка залишилася на місці.`;
    $('#submitResult').className='msg ok';
  }
  submitForm.addEventListener('submit',handleSubmitDemo);

  /* delegation */
  const list=document.getElementById('deleList');let ni=0;
  function addItem(t){const li=document.createElement('li');li.innerHTML=`<span>${esc(t)}</span><small class="counter">клікни</small>`;list.appendChild(li);$('#deleN').textContent=list.children.length;}
  ['Купити хліб','Вивчити JavaScript','Погуляти'].forEach(addItem);
  function handleListClick(e){
    const li=e.target.closest('li');if(!li)return;
    li.classList.toggle('done');
    say($('#deleMsg'),`Спрацював єдиний обробник на <ul>. e.target → <li> «${li.firstChild.textContent}»`,true);
  }
  list.addEventListener('click',handleListClick);
  function addTodo(){addItem('Нове завдання №'+(++ni));say($('#deleMsg'),'Новий елемент одразу працює — додатковий обробник не потрібен',true);}
  $('#deleAdd').onclick=addTodo;
})();
})();
