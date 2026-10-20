import { supabase } from './supabaseClient.js';

async function start() {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  location.replace('index.html');
  return;
}

const { data: profile, error: profileError } = await supabase.from('profiles')
  .select('*').eq('user_id', session.user.id).single();
if (profileError || profile?.role !== 'Scholar') {
  location.replace('index.html');
  return;
}
document.body.hidden = false;

async function loadSubmissions() {
  const { data, error } = await supabase.from('semester_submissions')
    .select('*').eq('scholar_id', session.user.id)
    .order('submitted_at', { ascending: false });
  const tbody = document.querySelector('#subs tbody');
  tbody.replaceChildren();
  if (error) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.textContent = `Could not load submissions: ${error.message}`;
    return;
  }
  if (!data?.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.textContent = 'No submissions yet.';
    return;
  }
  (data || []).forEach(s => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${s.academic_year}</td><td>${s.semester}</td>
        <td>${s.gwa}</td><td>${s.verification_status}</td>
        <td>${s.compliance_result ?? '—'}</td><td>${s.award_status}</td>
        <td>${new Date(s.submitted_at).toLocaleDateString()}</td>
      </tr>`);
  });
}

document.getElementById('submit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { data: assignment, error: assignmentError } = await supabase.from('scholar_assignments')
    .select('assignment_id').eq('user_id', session.user.id).eq('status', 'Active')
    .limit(1).maybeSingle();
  if (assignmentError) {
    document.getElementById('msg').textContent = `Could not load assignment: ${assignmentError.message}`;
    return;
  }
  if (!assignment) { document.getElementById('msg').textContent = 'No active assignment.'; return; }
  const payload = {
    assignment_id: assignment.assignment_id,
    scholar_id: session.user.id,
    academic_year: document.getElementById('ay').value.trim(),
    semester: document.getElementById('sem').value,
    gwa: parseFloat(document.getElementById('gwa').value),
    enrolled_units: parseInt(document.getElementById('units').value),
    failed_count: parseInt(document.getElementById('failed').value),
    incomplete_count: parseInt(document.getElementById('incomplete').value),
    dropped_count: parseInt(document.getElementById('dropped').value),
    evidence_reference: document.getElementById('evidence').value.trim()
  };
  const { error } = await supabase.from('semester_submissions').insert(payload);
  const msg = document.getElementById('msg');
  if (error) {
    msg.textContent = error.code === '23505'
      ? 'Duplicate: a submission already exists for this scholar, AY, and semester.'
      : error.message;
    return;
  }
  msg.textContent = 'Submitted.';
  e.target.reset();
  await loadSubmissions();
});

document.getElementById('logout').onclick = async () => {
  await supabase.auth.signOut(); location.href = 'index.html';
};

loadSubmissions();
}

start();