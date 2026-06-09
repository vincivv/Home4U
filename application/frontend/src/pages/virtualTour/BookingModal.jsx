import { useEffect, useId, useMemo, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const getTodayIsoDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const composeDescribedBy = (...ids) => {
  const filtered = ids.filter(Boolean);
  return filtered.length ? filtered.join(' ') : undefined;
};

const BookingModal = ({
  showBookingModal,
  closeBookingModal,
  bookingSubmitted,
  bookingSubmitting,
  bookingSubmitError,
  bookingFieldErrors,
  submitBooking,
  bookingForm,
  onBookingInput,
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusedRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const submitErrorId = useId();
  const successMessageId = useId();
  const notesHintId = useId();
  const notesCountId = useId();
  const todayIsoDate = useMemo(() => getTodayIsoDate(), []);

  const fieldError = (name) => bookingFieldErrors?.[name];
  const hasError = (name) => Boolean(fieldError(name));
  const notesLength = bookingForm.notes.length;

  useEffect(() => {
    if (!showBookingModal) return undefined;
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

    previousFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirstInDialog = () => {
      const root = modalRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled'),
      );
      const firstFocusable = focusables[0] || closeButtonRef.current || root;
      if (firstFocusable?.focus) firstFocusable.focus();
    };

    window.requestAnimationFrame(focusFirstInDialog);

    return () => {
      document.body.style.overflow = prevOverflow || '';
      const previous = previousFocusedRef.current;
      if (previous?.focus) previous.focus();
    };
  }, [showBookingModal]);

  if (!showBookingModal) return null;

  const onDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeBookingModal();
      return;
    }

    if (event.key !== 'Tab') return;
    const root = modalRef.current;
    if (!root) return;

    const focusables = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled'),
    );

    if (!focusables.length) {
      event.preventDefault();
      root.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !root.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="booking-modal-overlay" role="presentation" onClick={closeBookingModal}>
      <section
        ref={modalRef}
        className="booking-modal"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bookingSubmitted ? successMessageId : descriptionId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <div className="booking-modal-head">
          <p className="virtual-eyebrow">Action Room</p>
          <h3 id={titleId}>Book Your Consultation</h3>
          <button
            ref={closeButtonRef}
            type="button"
            className="booking-close"
            onClick={closeBookingModal}
            aria-label="Close booking modal"
            disabled={bookingSubmitting}
          >
            ✕
          </button>
        </div>
        {!bookingSubmitted ? (
          <form className="booking-form" onSubmit={submitBooking} noValidate aria-busy={bookingSubmitting}>
            <p className="booking-modal-description" id={descriptionId}>
              Share your contact details and preferred date. We will follow up with available slots.
            </p>
            {bookingSubmitError && (
              <p className="booking-form-error" role="alert" aria-live="assertive" id={submitErrorId}>
                {bookingSubmitError}
              </p>
            )}
            <label>
              Full Name
              <input
                className={hasError('name') ? 'booking-input-error' : ''}
                name="name"
                type="text"
                value={bookingForm.name}
                onChange={onBookingInput}
                placeholder="Jane Doe"
                autoComplete="name"
                required
                aria-invalid={hasError('name')}
                aria-describedby={composeDescribedBy(hasError('name') ? 'booking-name-error' : null)}
                aria-errormessage={hasError('name') ? 'booking-name-error' : undefined}
                disabled={bookingSubmitting}
              />
              {hasError('name') && <span id="booking-name-error" className="booking-field-error">{fieldError('name')}</span>}
            </label>
            <label>
              Email
              <input
                className={hasError('email') ? 'booking-input-error' : ''}
                name="email"
                type="email"
                value={bookingForm.email}
                onChange={onBookingInput}
                placeholder="jane@email.com"
                autoComplete="email"
                required
                aria-invalid={hasError('email')}
                aria-describedby={composeDescribedBy(hasError('email') ? 'booking-email-error' : null)}
                aria-errormessage={hasError('email') ? 'booking-email-error' : undefined}
                disabled={bookingSubmitting}
              />
              {hasError('email') && <span id="booking-email-error" className="booking-field-error">{fieldError('email')}</span>}
            </label>
            <label>
              Preferred Date
              <input
                className={hasError('date') ? 'booking-input-error' : ''}
                name="date"
                type="date"
                value={bookingForm.date}
                onChange={onBookingInput}
                min={todayIsoDate}
                required
                aria-invalid={hasError('date')}
                aria-describedby={composeDescribedBy(hasError('date') ? 'booking-date-error' : null)}
                aria-errormessage={hasError('date') ? 'booking-date-error' : undefined}
                disabled={bookingSubmitting}
              />
              {hasError('date') && <span id="booking-date-error" className="booking-field-error">{fieldError('date')}</span>}
            </label>
            <label>
              Project Notes
              <textarea
                className={hasError('notes') ? 'booking-input-error' : ''}
                name="notes"
                value={bookingForm.notes}
                onChange={onBookingInput}
                rows={3}
                placeholder="Tell us your project goals..."
                maxLength={500}
                aria-invalid={hasError('notes')}
                aria-describedby={composeDescribedBy(
                  hasError('notes') ? 'booking-notes-error' : null,
                  notesHintId,
                  notesCountId,
                )}
                aria-errormessage={hasError('notes') ? 'booking-notes-error' : undefined}
                disabled={bookingSubmitting}
              />
              {hasError('notes') && <span id="booking-notes-error" className="booking-field-error">{fieldError('notes')}</span>}
              <span id={notesHintId} className="booking-field-hint">Max 500 characters.</span>
              <span id={notesCountId} className="booking-char-count" aria-live="polite">{notesLength}/500</span>
            </label>
            <button type="submit" className="booking-submit" disabled={bookingSubmitting}>
              {bookingSubmitting ? 'Submitting Request…' : 'Confirm Consultation'}
            </button>
          </form>
        ) : (
          <div className="booking-success" role="status" aria-live="polite" id={successMessageId}>
            <h4>Consultation request sent</h4>
            <p>We received your details and will follow up with available time slots.</p>
            <button type="button" className="booking-submit" onClick={closeBookingModal}>Close</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default BookingModal;
