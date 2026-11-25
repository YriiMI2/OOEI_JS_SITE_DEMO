(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sourceOf(...functions){return functions.map(fn=>fn.toString()).join('\n\n');}
function formatCode(source){
  let out='',i=0,indent=0,paren=0,bracket=0,previous='';
  const lineLength=()=>out.length-(out.lastIndexOf('\n')+1);
  const trimEnd=()=>{out=out.replace(/[ \t]+$/,'');};
  const newline=()=>{trimEnd();if(out&&!out.endsWith('\n'))out+='\n';};
  const write=value=>{if(out.endsWith('\n')||!out){out+='  '.repeat(Math.max(0,indent));}out+=value;};
  const quotedEnd=(start,quote)=>{let p=start+1;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]===quote)return p+1;p++;}return p;};
  while(i<source.length){
    const ch=source[i],next=source[i+1];
    if(ch==='\n'){newline();i++;continue;}
    if(/\s/.test(ch)){if(!out.endsWith(' ')&&!out.endsWith('\n'))out+=' ';i++;continue;}
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
  const members=new Set('getElementById querySelector querySelectorAll addEventListener removeEventListener classList append appendChild remove textContent innerHTML value length map forEach filter find includes push pop shift unshift sort reverse'.split(' '));
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
      if(core.has(word))cls='tok-core';else if(keywords.has(word))cls='tok-keyword';else if(word==='true'||word==='false'||word==='null'||word==='undefined'||word==='NaN')cls='tok-literal';else if(builtins.has(word)||members.has(word))cls='tok-builtin';else if(/^\s*\(/.test(source.slice(i+word.length)))cls='tok-function';
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
const codeDialog=$('#codeDialog');
function showCode(title,source){
  const dependencies=[];
  if(source.includes('$(')&&!/const\s+\$\s*=/.test(source))dependencies.push(`const $ = ${$.toString()};`);
  if(source.includes('$$(')&&!/const\s+\$\$\s*=/.test(source))dependencies.push(`const $$ = ${$$.toString()};`);
  if(/\bparseAny\(/.test(source)&&!source.includes('function parseAny'))dependencies.push(parseAny.toString());
  if(/\bkind\(/.test(source)&&!source.includes('function kind'))dependencies.push(kind.toString());
  if(/\bfmt\(/.test(source)&&!source.includes('function fmt'))dependencies.push(fmt.toString());
  if(/\besc\(/.test(source)&&!source.includes('const esc'))dependencies.push(`const esc = ${esc.toString()};`);
  if(/\bsay\(/.test(source)&&!source.includes('function say'))dependencies.push(say.toString());
  if(dependencies.length)source=dependencies.join('\n\n')+'\n\n'+source;
  source=formatCode(source);
  $('#codeTitle').textContent=title;
  const lexerState={template:false};
  $('#codeSource').innerHTML=source.split('\n').map(line=>`<span class="code-line">${highlightCode(line,lexerState)||' '}</span>`).join('');
  codeDialog.showModal();
}
function onCode(target,make){target.classList.add('code-target');target.title='Правий клік — показати приклад коду';target.addEventListener('contextmenu',e=>{e.preventDefault();const content=make(e);if(content)showCode(content.title,content.source);});}
$('#codeClose').addEventListener('click',()=>codeDialog.close());
codeDialog.addEventListener('click',e=>{if(e.target===codeDialog)codeDialog.close();});

/* ===== page chrome ===== */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');}),{threshold:.06});
$$('.reveal').forEach(el=>io.observe(el));
const bar=$('#bar');
addEventListener('scroll',()=>{const h=document.documentElement;bar.style.width=(scrollY/Math.max(1,h.scrollHeight-innerHeight)*100)+'%';},{passive:true});
const navLinks=$$('nav a');
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)navLinks.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-45% 0px -50% 0px'});
$$('section.topic').forEach(s=>so.observe(s));
if(innerWidth>700)$('#fo').style.display='block';

/* ===== 08 DOM ===== */
(function(){
  const sb=$('#sandbox'),treeEl=$('#tree'),msg=$('#domMsg');
  sb.innerHTML='<h3>Привіт, DOM!</h3><p>Це звичайний абзац.</p><ul><li>Перший пункт</li><li>Другий пункт</li></ul><button>Кнопка</button>';
  let sel=null,nodes=[];
  function walk(el,root){
    const idx=nodes.push(el)-1;
    const cls=[...el.classList].map(c=>'.'+c).join('');
    const tag=root?'div#sandbox':el.tagName.toLowerCase()+cls;
    let kids='';
    el.childNodes.forEach(n=>{
      if(n.nodeType===1)kids+=walk(n,false);
      else if(n.nodeType===3&&n.textContent.trim())kids+=`<li class="tn-text">"${esc(n.textContent.trim())}"</li>`;
    });
    return `<li><span class="tn${el===sel?' sel':''}" data-i="${idx}">&lt;${esc(tag)}&gt;</span>${kids?'<ul>'+kids+'</ul>':''}</li>`;
  }
  function refresh(){
    nodes=[];treeEl.innerHTML='<ul>'+walk(sb,true)+'</ul>';
    $$('[data-sel]',sb).forEach(x=>x.removeAttribute('data-sel'));sb.removeAttribute('data-sel');
    if(sel&&sel!==sb)sel.setAttribute('data-sel','');
  }
  const name=el=>el===sb?'контейнер #sandbox':'<'+el.tagName.toLowerCase()+'>';
  function select(el){sel=el;refresh();say(msg,sel?'Обрано '+name(sel):'',true);}
  sb.addEventListener('click',e=>{e.preventDefault();select(e.target===sb?sb:e.target);});
  treeEl.addEventListener('click',e=>{const t=e.target.closest('.tn');if(t)select(nodes[+t.dataset.i]);});
  const need=()=>{if(!sel){say(msg,'Спершу обери елемент (клікни на сторінці або в дереві)',false);return false;}return true;};
  function addElement(){
    const parent=sel||sb,tag=$('#domTag').value,el=document.createElement(tag);
    el.textContent={p:'Новий абзац',span:'span-текст',li:'Новий пункт',h3:'Новий заголовок',button:'Кнопка',div:'Новий блок'}[tag];
    parent.appendChild(el);sel=el;refresh();say(msg,`createElement("${tag}") + appendChild → додано в ${name(parent)}`,true);
  }
  function toggleClass(){if(!need())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);const on=sel.classList.toggle('hl');refresh();say(msg,on?'Клас .hl додано':'Клас .hl прибрано',true);}
  function changeStyle(){
    if(!need())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);
    const h=Math.floor(Math.random()*360);sel.style.backgroundColor=`hsl(${h} 80% 80%)`;sel.style.color=`hsl(${h} 60% 25%)`;sel.style.borderRadius='8px';sel.style.padding='4px 8px';
    refresh();say(msg,'Стиль змінено напряму через style',true);
  }
  function deleteElement(){if(!need())return;if(sel===sb)return say(msg,'Контейнер видаляти не будемо 🙂',false);const n=name(sel);sel.remove();sel=null;refresh();say(msg,`${n} видалено з документа`,true);}
  function changeText(){if(!need())return;sel.textContent=$('#domText').value;refresh();say(msg,'Текст змінено. Увага: якщо в елемента були діти — вони зникли разом зі старим вмістом',true);}
  $('#dAdd').onclick=addElement;$('#dClass').onclick=toggleClass;$('#dStyle').onclick=changeStyle;$('#dDel').onclick=deleteElement;$('#dText').onclick=changeText;
  function find(){
    $$('[data-match]',sb).forEach(x=>x.removeAttribute('data-match'));
    const s=$('#domSel').value.trim();if(!s)return;
    try{const f=sb.querySelectorAll(s);f.forEach(x=>x.setAttribute('data-match',''));say(msg,f.length?`Знайдено елементів: ${f.length} (підсвічено зеленим)`:'Нічого не знайдено — повернуло порожній список',!!f.length);}
    catch(e){say(msg,'SyntaxError: некоректний селектор',false);}
  }
  $('#dFind').onclick=find;
  $('#domSel').addEventListener('keydown',e=>{if(e.key==='Enter')find();});
  function selectPreset(e){const chip=e.target.closest('.chip[data-s]');if(!chip)return;$('#domSel').value=chip.dataset.s;find();}
  $$('.chip[data-s]').forEach(c=>c.addEventListener('click',selectPreset));
  onCode($('#dom .stage'),e=>{
    const control=e.target.closest('button, [data-s]');
    const id=control?.id,func={dAdd:addElement,dClass:toggleClass,dStyle:changeStyle,dDel:deleteElement,dText:changeText,dFind:find}[id];
    const title=({dAdd:'Створення елемента',dClass:'Перемикання класу',dStyle:'Зміна стилю',dDel:'Видалення елемента',dText:'Зміна тексту',dFind:'Пошук за CSS-селектором'})[id]||'Вибір елемента DOM';
    const code=func||control?.dataset.s?sourceOf(...(func?[func]:[selectPreset,find])):sourceOf(walk,refresh,select);
    return{title,source:`const sb=$('#sandbox'),treeEl=$('#tree'),msg=$('#domMsg');\nlet sel=null,nodes=[];\nconst name=el=>el===sb?'контейнер #sandbox':'<'+el.tagName.toLowerCase()+'>';\nconst need=()=>{if(!sel){say(msg,'Спершу обери елемент',false);return false;}return true;};\n\n${sourceOf(walk,refresh,select,func||find,need)}`};
  });
  refresh();
})();


/* ===== 09 EVENTS ===== */
(function(){
  /* playground */
  const pad=$('#pad'),logEl=$('#evLog');
  const TYPES=['click','dblclick','contextmenu','mouseenter','mouseleave','mousemove','keydown','wheel'];
  const counts={},on={click:1,dblclick:1,mouseenter:1,mouseleave:1};
  let lines=[];
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
      if(t==='keydown'){info='key: '+(e.key===' '?'Space':e.key);if(e.key===' '||e.key.startsWith('Arrow'))e.preventDefault();}
      else if(t==='wheel'){e.preventDefault();info='deltaY: '+Math.round(e.deltaY);}
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
  onCode($('#evChecks'),e=>{const t=e.target.closest('label')?.querySelector('[data-t]')?.dataset.t;if(!t)return null;return{title:`Реальний обробник події ${t}`,source:`const pad = $('#pad');\nconst logEl = $('#evLog');\n\n${sourceOf(handler(t),toggleSubscription,listen,paintLog)}`} ;});
  onCode(pad,()=>({title:'Обробники інтерактивного поля',source:`const pad = $('#pad');\nconst logEl = $('#evLog');\n\n${sourceOf(handler('click'),handler('wheel'),listen,paintLog)}`}));
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
  function greetOnEnter(e){if(e.key==='Enter')greet();}
  nameIn.addEventListener('keydown',greetOnEnter);
  function resizeCircle(e){
    const v=+e.target.value,c=$('#circle');c.style.width=c.style.height=v+'px';c.textContent=v;c.style.filter=`hue-rotate(${(v-30)*2}deg)`;
  }
  $('#circR').addEventListener('input',resizeCircle);

  /* submit event */
  const submitForm=$('#submitDemo');let submitCount=0;
  function handleSubmitDemo(e){e.preventDefault();const name=$('#submitName').value.trim();submitCount++;$('#submitResult').textContent=`Форму оброблено для ${name} · submit №${submitCount}. Сторінка залишилася на місці.`;$('#submitResult').className='msg ok';}
  submitForm.addEventListener('submit',handleSubmitDemo);
  onCode(submitForm,()=>({title:'Обробка події submit',source:`const submitForm = $('#submitDemo');

${sourceOf(handleSubmitDemo)}

submitForm.addEventListener('submit', handleSubmitDemo);`}));

  /* mouseover and mouseout */
  const hoverDemo=$('#hoverDemo');let overCount=0,outCount=0;
  function handleHoverBoundary(e){if(e.relatedTarget&&hoverDemo.contains(e.relatedTarget))return;const part=e.target.closest('[data-hover-part]')?.dataset.hoverPart||'картка';if(e.type==='mouseover')$('#overCount').textContent=++overCount;else $('#outCount').textContent=++outCount;$('#hoverLast').textContent=`${e.type}: ${part} (target), картка (currentTarget)`;}
  hoverDemo.addEventListener('mouseover',handleHoverBoundary);
  hoverDemo.addEventListener('mouseout',handleHoverBoundary);
  onCode(hoverDemo,()=>({title:'Обробка mouseover та mouseout',source:`const hoverDemo = $('#hoverDemo');

${sourceOf(handleHoverBoundary)}

hoverDemo.addEventListener('mouseover', handleHoverBoundary);
hoverDemo.addEventListener('mouseout', handleHoverBoundary);`}));
  onCode($('#demoForm'),()=>({title:'Реальні обробники поля та форми',source:`const nameIn = $('#nameIn');\n\n${sourceOf(onNameInput,onNameChange,greet,greetOnEnter)}\n\nnameIn.addEventListener('input', onNameInput);\nnameIn.addEventListener('change', onNameChange);\nnameIn.addEventListener('keydown', greetOnEnter);`}));
  onCode($('#circR'),()=>({title:'Реальний обробник повзунка',source:`const circle = $('#circle');\n\n${sourceOf(resizeCircle)}`}));

  /* bubbling */
  const boxes=$$('.bx'),orderEl=$('#order');
  let capture=false,stopMid=false,order=[],pending=false,timers=[];
  function bh(e){
    order.push(this.dataset.n);
    if(stopMid&&this.dataset.n===$('#stopTarget').value)e.stopPropagation();
    if(!pending){pending=true;setTimeout(flush,0);}
  }
  function attach(){boxes.forEach(b=>{b.removeEventListener('click',bh,true);b.removeEventListener('click',bh,false);b.addEventListener('click',bh,capture);});}
  function flush(){
    pending=false;const seq=order;order=[];
    timers.forEach(clearTimeout);timers=[];boxes.forEach(b=>b.classList.remove('fire'));
    orderEl.innerHTML='';
    seq.forEach((n,i)=>{
      timers.push(setTimeout(()=>{
        const b=boxes.find(x=>x.dataset.n===n);b.classList.add('fire');
        orderEl.insertAdjacentHTML('beforeend',`${i?'<i style="color:var(--mute)">→</i>':''}<span class="pill" style="--c:var(--${n==='outer'?'violet':n==='middle'?'cyan':'pink'})">${i+1}. ${n}</span>`);
        setTimeout(()=>b.classList.remove('fire'),420);
      },i*480));
    });
    if(seq.length&&stopMid&&!seq.includes('outer')||(seq.length&&stopMid&&capture&&!seq.includes('inner'))){
      timers.push(setTimeout(()=>orderEl.insertAdjacentHTML('beforeend','<span class="counter">⛔ stopPropagation: далі подія не пішла</span>'),seq.length*480));
    }
  }
  function changePhase(e){
    const r=e.currentTarget;
    capture=r.value==='capture'&&r.checked?true:$('input[name=phase]:checked').value==='capture';
    $('#phBubble').classList.toggle('on',!capture);$('#phCapture').classList.toggle('on',capture);attach();
  }
  $$('input[name=phase]').forEach(r=>r.addEventListener('change',changePhase));
  function togglePropagationStop(e){stopMid=e.target.checked;$('#stopTog').classList.toggle('on',stopMid);}
  $('#stopMid').addEventListener('change',togglePropagationStop);
  onCode($('#events .stage:nth-of-type(3) .row'),()=>({title:'Реальні обробники спливання та занурення',source:`const boxes = $$('.bx');\nconst orderEl = $('#order');\n\n${sourceOf(bh,attach,changePhase,togglePropagationStop,flush)}`}));
  onCode($('#events .bx.outer'),()=>({title:'Як обробляється й показується порядок подій',source:`const boxes = $$('.bx');\nconst orderEl = $('#order');\n\n${sourceOf(bh,attach,flush)}`}));
  attach();

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
  onCode($('#deleList'),()=>({title:'Делегування подій списку',source:`const list=document.getElementById('deleList');let ni=0;\n\n${sourceOf(addItem,handleListClick,addTodo)}\n\n['Купити хліб','Вивчити JavaScript','Погуляти'].forEach(addItem);\nlist.addEventListener('click',handleListClick);\n$('#deleAdd').onclick=addTodo;`}));
  onCode($('#deleAdd'),()=>({title:'Додавання рядка у список',source:`const list=document.getElementById('deleList');let ni=0;\n\n${sourceOf(addItem,addTodo)}\n\n$('#deleAdd').onclick=addTodo;`}));
})();
})();
