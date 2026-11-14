// Miniloona — Supabase-backed applicant portal.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://qtklshvjjwntfrijzqxf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1fI8_z0cHKJYneq-2Ww_hzO4yEFA";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let authMode = "signup";
let currentUser = null;
let currentApplication = null;
const modal = $("authModal");

function message(id, text, isError=false) {
  const el = $(id); if (!el) return;
  el.textContent = text; el.style.color = isError ? "#e49a9a" : "";
}
function showModal(mode="signup") {
  authMode = mode; updateAuthMode(); modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
}
function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); }
function updateAuthMode() {
  $("signupTab").classList.toggle("active",authMode==="signup");
  $("loginTab").classList.toggle("active",authMode==="login");
  $("ageLine").hidden = authMode==="login";
  $("ageConfirm").required = authMode==="signup";
  $("authSubmit").textContent = authMode==="signup" ? "Create private account ↗" : "Sign in ↗";
  message("authMessage","");
}
document.querySelectorAll("[data-open-auth]").forEach(b=>b.addEventListener("click",()=>showModal(b.dataset.openAuth)));
document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",closeModal));
$("signupTab").addEventListener("click",()=>{authMode="signup";updateAuthMode()});
$("loginTab").addEventListener("click",()=>{authMode="login";updateAuthMode()});
$("menuToggle").addEventListener("click",()=>$("nav").classList.toggle("open"));
document.querySelectorAll("#nav a").forEach(a=>a.addEventListener("click",()=>$("nav").classList.remove("open")));

function needSetup() {
  message("authMessage","The private portal is temporarily unavailable. Please try again later.",true);
}
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabase){needSetup();return;}
  const email=$("authEmail").value.trim(), password=$("authPassword").value;
  $("authSubmit").disabled=true;
  try {
    if(authMode==="signup"){
      if(!$("ageConfirm").checked) throw new Error("Please confirm that you are 18 or older.");
      const {data,error}=await supabase.auth.signUp({email,password});
      if(error) throw error;
      if(data.session){closeModal();await loadWorkspace(data.user);}
      else message("authMessage","Account created. Check your email to confirm your address, then sign in.");
    } else {
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw error;
      closeModal();await loadWorkspace(data.user);
    }
  } catch(err){message("authMessage",err.message||"Unable to continue. Please try again.",true);}
  finally{$("authSubmit").disabled=false;}
});

function setPortalRole(role){
  $("applicantPanel").hidden=role==="admin";
  $("adminPanel").hidden=role!=="admin";
  $("workspaceTitle").innerHTML=role==="admin"?"Application <em>desk.</em>":"Your <em>application.</em>";
}
async function loadWorkspace(user){
  currentUser=user;
  $("signedInAs").textContent=user.email||"Signed in";
  $("workspace").hidden=false;
  document.body.style.overflow="hidden";
  $("workspace").scrollIntoView({behavior:"smooth"});
  const {data:admin,error:adminErr}=await supabase.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminErr){message("applicationMessage","Could not verify portal permissions. Please refresh or contact the site administrator.",true);return;}
  if(admin){setPortalRole("admin");await loadAdminApplications();}
  else {setPortalRole("applicant");await loadApplicantApplication();}
}
async function loadApplicantApplication(){
  const {data,error}=await supabase.from("applications").select("*").eq("user_id",currentUser.id).maybeSingle();
  if(error){message("applicationMessage","Could not load your application. "+error.message,true);return;}
  currentApplication=data;
  if(!data){$("appStatus").textContent="No application submitted";$("appStatusText").textContent="Complete your introduction below to begin.";return;}
  $("appStatus").textContent=labelStatus(data.status);
  $("appStatusText").textContent=statusDescription(data.status);
  $("appNotes").textContent=data.admin_note||"No additional updates have been shared yet.";
  $("applicationForm").hidden=true;
  if(data.status==="more_information_requested") {
    $("applicationForm").hidden=false;
    $("applicationForm").querySelector("h2").textContent="Additional information";
    $("applicationForm").querySelector("button[type=submit]").textContent="Send updated information ↗";
    const f=$("applicationForm");
    for(const key of ["preferred_name","age","location","experience","intent","boundaries","contact_preference","availability"]){
      if(f.elements[key]) f.elements[key].value=data[key]??"";
    }
  }
}
function labelStatus(s){return ({submitted:"Submitted for review",under_review:"Under personal review",pre_approved:"Pre-approved",more_information_requested:"More information requested",approved:"Approved",declined:"Not approved"})[s]||s;}
function statusDescription(s){return ({submitted:"Your application has been received. Miniloona will review it personally.",under_review:"Your application is being considered. Please watch for an update here.",pre_approved:"You have been pre-approved to continue the conversation. This is not a confirmed booking or consent to a session.",more_information_requested:"Miniloona has requested additional information. You can update your application below.",approved:"Your application has received final approval to proceed to the next agreed step. Any session still requires separate, informed consent.",declined:"Your application has not been approved. Thank you for your time."})[s]||"Your application status has been updated.";}

$("applicationForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabase||!currentUser)return;
  const f=e.currentTarget, fd=new FormData(f);
  if(Number(fd.get("age"))<18){message("applicationMessage","Applicants must be at least 18 years old.",true);return;}
  if(fd.get("adult_confirm")!=="on"||fd.get("consent_confirm")!=="on"){message("applicationMessage","Please confirm both the adult-only and application/consent statements.",true);return;}
  const payload={user_id:currentUser.id,preferred_name:fd.get("preferred_name"),age:Number(fd.get("age")),location:fd.get("location"),experience:fd.get("experience"),intent:fd.get("intent"),boundaries:fd.get("boundaries"),contact_preference:fd.get("contact_preference"),availability:fd.get("availability"),status:"submitted",adult_confirmed:true,consent_confirmed:true};
  const button=$("applicationSubmit");button.disabled=true;
  try{
    const {error}=currentApplication
      ? await supabase.from("applications").update({...payload,status:"submitted"}).eq("user_id",currentUser.id)
      : await supabase.from("applications").insert(payload);
    if(error)throw error;
    message("applicationMessage","Your application has been securely submitted for personal review.");
    await loadApplicantApplication();
  }catch(err){message("applicationMessage",err.message||"Submission failed. Please try again.",true);}
  finally{button.disabled=false;}
});

async function loadAdminApplications(){
  const list=$("adminList");list.textContent="Loading applications…";
  const {data,error}=await supabase.from("applications").select("*").order("created_at",{ascending:false});
  if(error){list.textContent="Unable to load applications. Check admin permissions.";return;}
  if(!data.length){list.innerHTML='<div class="admin-empty">No applications have been submitted yet.</div>';return;}
  list.innerHTML="";
  data.forEach(a=>{
    const card=document.createElement("article");card.className="admin-card";
    const safe=(v)=>String(v??"—");
    card.innerHTML=`<small>${safe(a.status).replaceAll("_"," ").toUpperCase()} · ${new Date(a.created_at).toLocaleString()}</small><h3></h3><p class="app-meta"></p><p class="app-intent"></p><p class="app-boundaries"></p><div class="admin-controls"><label>Update status<select class="status-select"><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="pre_approved">Pre-approved</option><option value="more_information_requested">More information requested</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label><label>Private update for applicant<textarea class="admin-note" rows="2" maxlength="1200" placeholder="Write a concise update or next step"></textarea></label><button class="button button-gold save-review">Save update ↗</button></div><p class="form-message review-message" role="status"></p>`;
    card.querySelector("h3").textContent=a.preferred_name||"Applicant";
    card.querySelector(".app-meta").textContent=`Age: ${a.age} · ${a.location} · ${a.experience} · ${a.contact_preference} · ${a.availability||"Availability not provided"}`;
    card.querySelector(".app-intent").textContent="HOPES & EXPECTATIONS\n"+safe(a.intent);
    card.querySelector(".app-boundaries").textContent="BOUNDARIES / CONSIDERATIONS\n"+safe(a.boundaries);
    card.querySelector(".status-select").value=a.status;
    card.querySelector(".admin-note").value=a.admin_note||"";
    card.querySelector(".save-review").addEventListener("click",async()=>{
      const btn=card.querySelector(".save-review");btn.disabled=true;
      const {error}=await supabase.from("applications").update({status:card.querySelector(".status-select").value,admin_note:card.querySelector(".admin-note").value,reviewed_at:new Date().toISOString()}).eq("id",a.id);
      const msg=card.querySelector(".review-message");
      msg.textContent=error?("Could not save: "+error.message):"Update saved.";
      if(!error)card.querySelector("small").textContent=card.querySelector(".status-select").value.replaceAll("_"," ").toUpperCase()+" · "+new Date(a.created_at).toLocaleString();
      btn.disabled=false;
    });
    list.appendChild(card);
  });
}
$("signOut").addEventListener("click",async()=>{if(supabase)await supabase.auth.signOut();currentUser=null;currentApplication=null;$("workspace").hidden=true;document.body.style.overflow="";window.scrollTo({top:0,behavior:"smooth"});});
