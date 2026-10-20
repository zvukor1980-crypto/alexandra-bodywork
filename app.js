let soundOn=false,audioContext=null,ambienceGain=null;
function updateSoundLabel(){const en=document.documentElement.lang==='en';document.getElementById('sound-label').textContent=en?(soundOn?'Sound on':'Sound off'):(soundOn?'Звук включён':'Звук выключен');document.getElementById('sound-toggle').setAttribute('aria-pressed',String(soundOn));}
document.getElementById('year').textContent=new Date().getFullYear();
// A quiet synthesized water ambience. Starts only after an explicit tap.
function createAmbience(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 audioContext=new AC();ambienceGain=audioContext.createGain();ambienceGain.gain.value=0;ambienceGain.connect(audioContext.destination);
 const length=audioContext.sampleRate*6,buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);let previous=0;
 for(let i=0;i<length;i++){previous=(previous+Math.random()*0.045-0.0225)/1.025;data[i]=previous;}
 const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;
 const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;noise.connect(filter);filter.connect(ambienceGain);noise.start();
 const waterGain=audioContext.createGain();waterGain.gain.value=.65;filter.disconnect();filter.connect(waterGain);waterGain.connect(ambienceGain);const wave=audioContext.createOscillator(),mod=audioContext.createGain();wave.frequency.value=.085;mod.gain.value=.2;wave.connect(mod);mod.connect(waterGain.gain);wave.start();return true;
}
document.getElementById('sound-toggle').addEventListener('click',async()=>{try{if(!audioContext&&!createAmbience()){document.getElementById('sound-label').textContent=document.documentElement.lang==='en'?'Sound unavailable':'Звук недоступен';return;}await audioContext.resume();soundOn=!soundOn;ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);ambienceGain.gain.setTargetAtTime(soundOn?.28:0,audioContext.currentTime,.7);if(!soundOn)setTimeout(()=>{if(!soundOn)audioContext.suspend();},2000);updateSoundLabel();}catch{document.getElementById('sound-label').textContent=document.documentElement.lang==='en'?'Sound unavailable':'Звук недоступен';}});
document.addEventListener('visibilitychange',()=>{if(audioContext&&document.hidden){audioContext.suspend();soundOn=false;updateSoundLabel();}});

window.addEventListener('pagehide',()=>{if(audioContext){ambienceGain.gain.cancelScheduledValues(audioContext.currentTime);ambienceGain.gain.setValueAtTime(0,audioContext.currentTime);audioContext.suspend();soundOn=false;updateSoundLabel();}});
