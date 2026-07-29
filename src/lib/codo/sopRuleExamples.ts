/**
 * Structured SOP v2.0 extras for Common CODO developer rules.
 * Requirement + Malayalam come from the DB description; Bad/Good examples live here.
 */

export type CodoSopExample = {
  bad?: string;
  good?: string;
  /** Language label for the good-example code fence */
  language?: string;
};

export const CODO_SOP_EXAMPLES: Record<string, CodoSopExample> = {
  dev_rule_1: {
    bad: 'const closeModal = () => setShowModal(false); // State retained in background',
    good: `const closeModal = () => {
  setFormData(initialState); // Clear state
  setShowModal(false);
};

useEffect(() => {
  return () => setFormData(initialState); // Cleanup on unmount
}, []);`,
    language: 'JavaScript',
  },
  dev_rule_2: {
    bad: 'Alerting errors only inside handleSubmit().',
    good: `<input
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    setError(!e.target.value.includes("@") ? "Invalid email address" : "");
  }}
/>
{error && <span className="text-red-500 text-xs mt-1">{error}</span>}`,
    language: 'JavaScript',
  },
  dev_rule_3: {
    good: `const handleClose = () => {
  if (isFormDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
    return;
  }
  setShowModal(false);
};`,
    language: 'JavaScript',
  },
  dev_rule_5: {
    bad: '<input type="number" /> (Allows typing 50 digits)',
    good: `<input
  type="text"
  value={phone}
  onChange={(e) => {
    const numOnly = e.target.value.replace(/\\D/g, "");
    setPhone(numOnly.slice(0, 10)); // Hard limit at 10
  }}
/>`,
    language: 'JavaScript',
  },
  dev_rule_8: {
    bad: '<button onClick={saveData}>Submit</button>',
    good: `const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (loading) return;
  setLoading(true);
  try {
    await api.save(data);
  } finally {
    setLoading(false);
  }
};

return (
  <button disabled={loading} onClick={handleSubmit}>
    {loading ? <Spinner /> : "Submit"}
  </button>
);`,
    language: 'JavaScript',
  },
  dev_rule_9: {
    good: `<button onClick={() => setConfirmDeleteId(item.id)}>Delete</button>

{confirmDeleteId && (
  <ConfirmModal
    width="400px"
    onConfirm={() => executeDelete(confirmDeleteId)}
    onClose={() => setConfirmDeleteId(null)}
  />
)}`,
    language: 'JavaScript',
  },
};

/** Split stored description into English requirement + Malayalam body. */
export function parseCodoRuleDescription(description: string): {
  requirement: string;
  malayalam?: string;
} {
  const raw = description?.trim() ?? '';
  if (!raw) return { requirement: '' };

  const match = raw.match(/^([\s\S]*?)\n+Malayalam:\s*([\s\S]*)$/i);
  if (match) {
    return {
      requirement: match[1].trim(),
      malayalam: match[2].trim() || undefined,
    };
  }

  return { requirement: raw };
}
