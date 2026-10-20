import { supabase } from './supabaseClient.js';

async function start() {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  location.replace('index.html');
  return;
}

const { data: profile, error: profileError } = await supabase.from('profiles')
  .select('*').eq('user_id', session.user.id).single();
if (profileError || profile?.role !== 'Scholarship Staff') {
  location.replace('index.html');
  return;
}
document.body.hidden = false;

let current = null;

async function loadQueue() {
  const { data, error } = await supabase.from('semester_submissions')
    .select(`
      submission_id, academic_year, semester, gwa, enrolled_units,
      verification_status, compliance_result, award_status, scholar_id,
      profiles:profiles!semester_submissions_scholar_id_fkey ( full_name )
    `)
    .order('submitted_at', { ascending: false });

  const tbody = document.querySelector('#queue tbody');
  tbody.replaceChildren();
  if (error) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 9;
    cell.textContent = `Could not load submissions: ${error.message}`;
    return;
  }
  if (!data?.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 9;
    cell.textContent = 'No submissions to review.';
    return;
  }

  data.forEach((submission) => {
    const row = tbody.insertRow();
    const values = [
      submission.profiles?.full_name ?? submission.scholar_id,
      submission.academic_year,
      submission.semester,
      submission.gwa,
      submission.enrolled_units,
      submission.verification_status,
      submission.compliance_result ?? '—',
      submission.award_status
    ];
    values.forEach((value) => {
      row.insertCell().textContent = value;
    });

    const actionsCell = row.insertCell();
    const actionButtons = submission.verification_status === 'Submitted'
      ? [['verify', 'Verify'], ['return', 'Return']]
      : submission.verification_status === 'Verified'
        ? [['evaluate', 'Evaluate']]
        : [];
    actionButtons.forEach(([action, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.act = action;
      button.dataset.id = submission.submission_id;
      button.textContent = label;
      actionsCell.append(button);
    });
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
}

start();