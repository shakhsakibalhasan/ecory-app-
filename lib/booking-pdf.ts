import { Capacitor } from "@capacitor/core";

const bytes = (text: string) => new TextEncoder().encode(text);
const join = (parts: Uint8Array[]) => { const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;parts.forEach(p=>{out.set(p,offset);offset+=p.length;});return out; };
/** Small, standards-based PDF containing one JPEG page per receipt canvas. */
export function imagePagesPdf(images: { data: Uint8Array; width: number; height: number }[]): Uint8Array {
 if(!images.length) throw new Error("No receipt pages");
 const objects:Uint8Array[]=[];const kids=images.map((_,i)=>`${3+i*3} 0 R`).join(" ");
 objects.push(bytes("<< /Type /Catalog /Pages 2 0 R >>"),bytes(`<< /Type /Pages /Count ${images.length} /Kids [${kids}] >>`));
 images.forEach((image,i)=>{const page=3+i*3,content=page+1,xobject=page+2;
  objects.push(bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Image ${xobject} 0 R >> >> /Contents ${content} 0 R >>`));
  const stream=bytes("q\n595 0 0 842 0 0 cm\n/Image Do\nQ\n");objects.push(join([bytes(`<< /Length ${stream.length} >>\nstream\n`),stream,bytes("endstream")]));
  objects.push(join([bytes(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`),image.data,bytes("\nendstream")]));
 });
 const parts=[bytes("%PDF-1.4\n")];const offsets=[0];let length=parts[0]!.length;
 objects.forEach((object,i)=>{offsets.push(length);const entry=join([bytes(`${i+1} 0 obj\n`),object,bytes("\nendobj\n")]);parts.push(entry);length+=entry.length;});
 const xref=length;
 parts.push(bytes(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));return join(parts);
}
export async function saveBookingPdf(id: string, title: string, lines: string[], bn: boolean) {
 await document.fonts.ready;
 await document.fonts.load(`400 32px "${bn?"Hind Siliguri":"Open Sans"}"`);
 const pages:{data:Uint8Array;width:number;height:number}[]=[];let canvas=document.createElement("canvas");let ctx=canvas.getContext("2d")!;let y=220;
 const family=bn?'"Hind Siliguri", sans-serif':'"Open Sans", sans-serif';
 function startPage(){canvas=document.createElement("canvas");canvas.width=1240;canvas.height=1754;ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,1240,1754);ctx.fillStyle="#f4f7ef";ctx.fillRect(0,0,1240,190);ctx.fillStyle="#4D741C";ctx.font=`600 52px ${family}`;ctx.fillText("ECORY",64,98);ctx.fillStyle="#000";ctx.font=`600 34px ${family}`;ctx.fillText(title,64,156);ctx.font=`400 24px ${family}`;ctx.textAlign="right";ctx.fillText(`#${id.slice(0,8).toUpperCase()}`,1176,98);ctx.textAlign="left";ctx.strokeStyle="#ddd";ctx.beginPath();ctx.moveTo(64,182);ctx.lineTo(1176,182);ctx.stroke();y=230;}
 function finishPage(){ctx.fillStyle="#000";ctx.font=`400 24px ${family}`;ctx.strokeStyle="#ddd";ctx.beginPath();ctx.moveTo(64,1650);ctx.lineTo(1176,1650);ctx.stroke();ctx.fillText(`Ecory · ${pages.length+1}`,64,1692);ctx.textAlign="right";ctx.fillText(bn?"বুকিং রসিদ — পেমেন্টের প্রমাণ নয়":"Booking receipt — not proof of payment",1176,1692);ctx.textAlign="left";const encoded=canvas.toDataURL("image/jpeg",.92).split(",")[1]!;pages.push({data:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),width:1240,height:1754});}
 startPage();
 for(const entry of lines){for(const logical of entry.split("\n")){
  if(logical){ctx.fillStyle="#f8f9f6";ctx.fillRect(52,y-36,1136,49);}else{y+=12;}
  ctx.font=`${/[1১]/.test(logical)?700:400} 32px ${family}`;
  let line="";
  for(const char of logical){if(ctx.measureText(line+char).width>1100){if(y>1600){finishPage();startPage();ctx.font=`${/[1১]/.test(logical)?700:400} 32px ${family}`;}ctx.fillStyle="#000";ctx.fillText(line,64,y);y+=48;line="";}line+=char;}
  if(y>1600){finishPage();startPage();ctx.font=`${/[1১]/.test(logical)?700:400} 32px ${family}`;}ctx.fillStyle="#000";ctx.fillText(line,64,y);y+=56;
 }}
 finishPage();const pdf=imagePagesPdf(pages);const name=`Ecory-Booking-${id.slice(0,8)}.pdf`;
 if(Capacitor.isNativePlatform()){
  const [{Filesystem,Directory},{Share}]=await Promise.all([import("@capacitor/filesystem"),import("@capacitor/share")]);
  let binary="";for(const byte of pdf)binary+=String.fromCharCode(byte);
  const file=await Filesystem.writeFile({path:name,directory:Directory.Cache,data:btoa(binary)});
  await Share.share({title,files:[file.uri],dialogTitle:bn?"বুকিং PDF সংরক্ষণ/শেয়ার করুন":"Save or share booking PDF"});
 }else{
  const blob=new Blob([pdf.buffer as ArrayBuffer],{type:"application/pdf"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
}
