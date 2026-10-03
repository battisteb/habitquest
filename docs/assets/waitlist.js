// HabitQuest public site: the launch waitlist form (insert-only table, L4).
(function () {
  const form = document.getElementById('waitlist');
  if (!form) return;
  const msg = form.querySelector('.waitlist-msg');
  const button = form.querySelector('button');

  const say = (ok) => {
    msg.textContent = ok ? msg.dataset.ok : msg.dataset.error;
    msg.className = 'waitlist-msg ' + (ok ? 'ok' : 'error');
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = form.email.value.trim();
    // Bots fill the hidden field; humans never see it.
    if (form.website.value) return say(true);
    if (!form.consent.checked || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say(false);

    button.disabled = true;
    fetch(form.dataset.url + '/rest/v1/waitlist', {
      method: 'POST',
      headers: {
        apikey: form.dataset.key,
        Authorization: 'Bearer ' + form.dataset.key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email: email, lang: form.dataset.lang, consent: true }),
    })
      .then(function (r) {
        // 409: already on the list, which is fine.
        const ok = r.ok || r.status === 409;
        say(ok);
        if (ok) form.reset();
      })
      .catch(function () { say(false); })
      .finally(function () { button.disabled = false; });
  });
})();
