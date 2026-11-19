import { useState, useEffect } from "react";
import {
  getCompanyConfigs,
  createCompanyConfig,
  updateCompanyConfig,
  deleteCompanyConfig,
} from "../../../services/companyConfigService.js";

const CompanyMaster = () => {
  const [configs, setConfigs] = useState([]);

  const [form, setForm] = useState({
    company_name: "",
    company_logo: "",
    address: "",
    contact_email: "",
    contact_phone: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch Companies
  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCompanyConfigs();
      setConfigs(data);
    } catch (err) {
      setError("Failed to fetch company configs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Form Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Create / Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await updateCompanyConfig(editingId, form);
        setSuccess("Updated successfully");
      } else {
        await createCompanyConfig(form);
        setSuccess("Created successfully");
      }

      setForm({
        company_name: "",
        company_logo: "",
        address: "",
        contact_email: "",
        contact_phone: "",
      });

      setEditingId(null);

      fetchConfigs();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Edit Company
  const handleEdit = (config) => {
    setForm({
      company_name: config.company_name,
      company_logo: config.company_logo,
      address: config.address,
      contact_email: config.contact_email,
      contact_phone: config.contact_phone,
    });

    setEditingId(config.id);
  };

  // Delete Company
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this company?"
    );

    if (!confirmDelete) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteCompanyConfig(id);
      setSuccess("Deleted successfully");
      fetchConfigs();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  // Cancel Edit
  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      company_name: "",
      company_logo: "",
      address: "",
      contact_email: "",
      contact_phone: "",
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">

      <h1 className="text-2xl font-bold mb-6">Company Master</h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow mb-8 space-y-4"
      >
        <input
          name="company_name"
          value={form.company_name}
          onChange={handleChange}
          placeholder="Company Name"
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="company_logo"
          value={form.company_logo}
          onChange={handleChange}
          placeholder="Logo URL"
          className="w-full border p-2 rounded"
        />

        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Address"
          className="w-full border p-2 rounded"
        />

        <input
          name="contact_email"
          value={form.contact_email}
          onChange={handleChange}
          placeholder="Contact Email"
          className="w-full border p-2 rounded"
        />

        <input
          name="contact_phone"
          value={form.contact_phone}
          onChange={handleChange}
          placeholder="Contact Phone"
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {editingId ? "Update" : "Create"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="ml-2 bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </form>

      {/* TABLE */}

      <table className="w-full bg-white rounded shadow">

        <thead>
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Logo</th>
            <th className="p-2 text-left">Address</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Phone</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {configs.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center p-4">
                No company found
              </td>
            </tr>
          )}

          {configs.map((config) => (
            <tr key={config.id}>

              <td className="p-2">{config.company_name}</td>

              <td className="p-2">
                {config.company_logo && (
                  <img
                    src={config.company_logo}
                    alt="logo"
                    className="h-8"
                  />
                )}
              </td>

              <td className="p-2">{config.address}</td>

              <td className="p-2">{config.contact_email}</td>

              <td className="p-2">{config.contact_phone}</td>

              <td className="p-2 text-center">

                <button
                  onClick={() => handleEdit(config)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(config.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>

              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
};

export default CompanyMaster;