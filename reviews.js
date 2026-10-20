(() => {
 const form=document.getElementById('review-form');
 if(!form) return;
 const en=document.documentElement.lang==='en';
 const t=(ru,eng)=>en?eng:ru;
 const endpoint='https://kfxhmjbdyovododkndpu.supabase.co/functions/v1/alexandra-reviews';
 const headers={apikey:'sb_publishable_iZakAF0HwDNE774ZX939fg_P5mtH8GC','Content-Type':'application/json'};
 const list=document.getElementById('review-list'),summary=document.getElementById('review-summary'),more=document.getElementById('review-more'),status=document.getElementById('review-status'),submit=document.getElementById('review-submit');
 const body=document.getElementById('review-body');
 let cursor=null,loaded=0,submissionId=null,posting=false;
 const seen=new Set();
 function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function card(review){
  const el=make('article','review-card');
  const head=make('header'),identity=make('div');
  identity.append(make('h3','',review.name));
  const date=make('time','review-date',new Date(review.created_at).toLocaleDateString(en?'en-GB':'ru-RU',{day:'numeric',month:'long',year:'numeric'}));
  date.dateTime=review.created_at;identity.append(date);head.append(identity);
  const stars=make('span','review-stars','★'.repeat(review.rating)+'☆'.repeat(5-review.rating));
  stars.setAttribute('aria-label',t('Оценка: ','Rating: ')+review.rating+' / 5');head.append(stars);
  el.append(head,make('p','',review.body));return el;
 }
 async function request(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(url,{...options,headers,signal:controller.signal,cache:'no-store'});
   let data;try{data=await response.json();}catch{throw new Error('UNAVAILABLE');}
   if(!response.ok)throw new Error(data.error||'UNAVAILABLE');return data;
  }finally{clearTimeout(timer);}
 }
 async function load(reset=false){
  list.setAttribute('aria-busy','true');more.disabled=true;
  if(reset){cursor=null;loaded=0;seen.clear();list.replaceChildren(make('p','',t('Загружаем отзывы…','Loading reviews…')));}
  try{
   const data=await request(endpoint+(cursor?'?before='+encodeURIComponent(cursor):''));
   if(reset)list.replaceChildren();
   for(const review of data.reviews){if(!seen.has(review.id)){seen.add(review.id);list.append(card(review));loaded++;}}
   summary.textContent=data.total?t('Отзывов: ','Reviews: ')+data.total+' · '+data.average+' / 5':t('Станьте первым, кто оставит отзыв на сайте.','Be the first to leave a review on the website.');
   if(!data.total)list.replaceChildren(make('p','',t('После сеанса поделитесь впечатлениями — ваш отзыв появится здесь.','Share your experience after a session — your review will appear here.')));
   cursor=data.reviews.length?data.reviews[data.reviews.length-1].created_at:cursor;
   more.hidden=loaded>=data.total||!data.reviews.length;
  }catch{
   if(reset)list.replaceChildren(make('p','',t('Отзывы пока не загрузились. ','Reviews could not be loaded. ')));
   const retry=make('button','button secondary',t('Попробовать ещё раз','Try again'));retry.type='button';retry.addEventListener('click',()=>load(true));list.append(retry);more.hidden=true;
  }finally{list.setAttribute('aria-busy','false');more.disabled=false;}
 }
 body.addEventListener('input',()=>document.getElementById('review-counter').textContent=body.value.length+' / 1500');
 form.addEventListener('input',()=>{if(!posting)submissionId=null;});
 more.addEventListener('click',()=>load(false));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(posting||!form.reportValidity())return;
  const data=new FormData(form);
  if(data.get('website'))return;
  submissionId=submissionId||crypto.randomUUID();
  const payload={name:String(data.get('name')||'').trim(),rating:Number(data.get('rating')),body:String(data.get('body')||'').trim(),consent:data.get('consent')==='on',website:'',submissionId};
  if(payload.name.length<2||payload.body.length<20){status.dataset.error='true';status.textContent=t('Укажите имя от 2 символов и отзыв от 20 символов.','Use at least 2 characters for your name and 20 for your review.');return;}
  posting=true;submit.disabled=true;status.dataset.error='false';status.textContent=t('Публикуем отзыв…','Publishing your review…');
  try{
   await request(endpoint,{method:'POST',body:JSON.stringify(payload)});
   form.reset();submissionId=null;document.getElementById('review-counter').textContent='0 / 1500';
   status.textContent=t('Спасибо! Ваш отзыв опубликован на сайте.','Thank you! Your review is published on the website.');
   await load(true);
  }catch(error){
   status.dataset.error='true';status.textContent=error.message==='RATE_LIMIT'?t('Вы уже недавно оставляли отзыв. Попробуйте позже.','You recently submitted a review. Please try again later.'):t('Не удалось отправить отзыв. Текст сохранён в форме — попробуйте ещё раз.','Your review could not be sent. Your text is still in the form — please try again.');
  }finally{posting=false;submit.disabled=false;}
 });
 load(true);
})();
