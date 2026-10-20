import { supabase } from './supabaseClient.js';

const { data: { session } } = await supabase.auth.getSession();
if (!session) location.href = 'index.html';

const { data: profile } = await supabase.from('profiles')
  .select('*').eq('user_id', session.user.id).single();
if (profile.role !== 'Scholarship Staff') location.href = 'scholar.html';

let current = null;

async function loadQueue() {
  const { data, error } = await supabase.from('semester_submissions')
    .select(`
      submission_id, academic_year, semester, gwa, enrolled_units,
      verification_status, compliance_result, award_status, scholar_id,
      profiles:scholar_id ( full_name )
    `)
    .order('submitted_at', { ascending: false });

  const tbody = document.querySelector('#queue tbody');
  tbody.innerHTML = '';
  (data || []).forEach(s => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${s.profiles?.full_name ?? s.scholar_id}</td>
        <td>${s.academic_year}</td><td>${s.semester}</td>
        <td>${s.gwa}</td><td>${s.enrolled_units}</td>
        <td>${s.verification_status}</td>
        <td>${s.compliance_result ?? '—'}</td>
        <td>${s.award_status}</td>
        <td>
          ${s.verification_status === 'Submitted'
            ? `<button data-act="verify" data-id="${s.submission_id}">Verify</button>
               <button data-act="return" data-id="${s.submission_id}">Return</button>`
            : ''}
          ${s.verification_status === 'Verified'
            ? `<button data-act="evaluate" data-id="${s.submission_id}">Evaluate</button>`
            : ''}
        </td>
      </tr>`);
  });
}

document.querySelector('#queue').addEventListener('click', async (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;

  if (act === 'verify' || act === 'return') {
    const status = act === 'verify' ? 'Verified' : 'Returned for Correction';
    const { error } = await supabase.from('semester_submissions')
      .update({ verification_status: status }).eq('submission_id', id);
    if (error) return alert(error.message);
    await supabase.from('evaluation_history').insert({
      submission_id: id, staff_id: session.user.id,
      reason: `Verification status set to ${status}.`
    });
    loadQueue();
  }

  if (act === 'evaluate') {
    current = id;
    document.getElementById('eval-panel').hidden = false;
    document.getElementById('eval-target').textContent = `Submission ${id.slice(0,8)}`;
  }
});

document.getElementById('save-eval').onclick = async () => {
  if (!current) return;
  const compliance = document.getElementById('compliance').value;
  const decision = document.getElementById('decision').value;
  const reason = document.getElementById('reason').value.trim();
  if (!reason) { document.getElementById('eval-msg').textContent = 'Reason required.'; return; }

  const { error: e1 } = await supabase.from('semester_submissions')
    .update({ compliance_result: compliance }).eq('submission_id', current);
  if (e1) return alert(e1.message);

  const { error: e2 } = await supabase.from('evaluation_history').insert({
    submission_id: current, staff_id: session.user.id,
    compliance_result: compliance, decision, reason
  });
  if (e2) return alert(e2.message);

  document.getElementById('eval-msg').textContent = 'Saved.';
  document.getElementById('reason').value = '';
  document.getElementById('eval-panel').hidden = true;
  current = null;
  loadQueue();
};

document.getElementById('logout').onclick = async () => {
  await supabase.auth.signOut(); location.href = 'index.html';
};

loadQueue();