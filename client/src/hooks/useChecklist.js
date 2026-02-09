import { useState, useCallback } from 'react';
import { DEFAULT_FORM_DATA } from '../lib/pdfTemplate';

export default function useChecklist() {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAmountChange = useCallback((field, amountField, value) => {
    setFormData((prev) => ({
      ...prev,
      [amountField]: value,
      [field]: value && parseFloat(value) > 0,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
  }, []);

  const loadChecklist = useCallback((data) => {
    setFormData((prev) => ({
      ...DEFAULT_FORM_DATA,
      ...data,
      attachments: data.attachments || [],
    }));
  }, []);

  return { formData, setFormData, handleChange, handleAmountChange, resetForm, loadChecklist };
}
