import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { FaUserCircle } from "react-icons/fa";

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [showResetIndex, setShowResetIndex] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("nova_users")) || [];
    setUsers(saved);
  }, []);

  const handleRoleChange = (index, newRole) => {
    const updatedUsers = [...users];
    if (updatedUsers[index].role === "owner") return;
    updatedUsers[index].role = newRole;
    setUsers(updatedUsers);
    localStorage.setItem("nova_users", JSON.stringify(updatedUsers));
  };

  const handleDelete = (index) => {
    if (users[index].role === "owner") return;
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
    localStorage.setItem("nova_users", JSON.stringify(updatedUsers));
  };

  const handleResetPassword = (index) => {
    setShowResetIndex(index);
    setNewPassword("");
    setShowPassword(false);
  };

  const confirmResetPassword = (index) => {
    if (!newPassword) return;
    const updatedUsers = [...users];
    updatedUsers[index].password = newPassword;
    setUsers(updatedUsers);
    localStorage.setItem("nova_users", JSON.stringify(updatedUsers));
    setShowResetIndex(null);
    alert("Password updated successfully.");
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(users);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "nova_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Nova Tech - User List", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Email", "Role", "Registered"]],
      body: users.map((user) => [user.email, user.role, user.registeredAt || "-"])
    });
    doc.save("nova_users.pdf");
  };

  const filteredUsers = users
    .filter(user =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.registeredAt || 0);
      const dateB = new Date(b.registeredAt || 0);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          ← Back to Dashboard
        </button>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
          >
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="text-sm bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
        >
          Sort by Date: {sortAsc ? "Oldest" : "Newest"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by email or role..."
        className="mb-4 w-full px-3 py-2 rounded bg-gray-800 text-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="space-y-4">
        {filteredUsers.map((user, index) => (
          <li
            key={index}
            className="bg-gray-800 p-4 rounded shadow flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-700 rounded-full p-2">
                <FaUserCircle className="text-3xl text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">{user.email}</p>
                <p className="text-sm text-gray-400 capitalize">{user.role}</p>
                <p className="text-xs text-gray-500">Registered: {user.registeredAt || "-"}</p>
                <p className="text-xs text-gray-500">Last Login: {user.lastLogin || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="bg-gray-700 text-white px-2 py-1 rounded"
                value={user.role}
                onChange={(e) => handleRoleChange(index, e.target.value)}
                disabled={user.role === "owner"}
              >
                <option value="owner">Owner</option>
                <option value="technician">Technician</option>
                <option value="intern">Intern</option>
              </select>

              <button
                onClick={() => handleResetPassword(index)}
                className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded text-sm"
              >
                Reset Password
              </button>

              {user.role !== "owner" && (
                <button
                  onClick={() => handleDelete(index)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              )}
            </div>

            {showResetIndex === index && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-70 z-50">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl space-y-4">
                  <h3 className="text-lg font-bold">Reset Password for {user.email}</h3>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    className="w-full p-2 rounded bg-gray-700"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={() => setShowPassword(!showPassword)}
                    />
                    Show Password
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowResetIndex(null)}
                      className="bg-gray-600 px-3 py-1 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmResetPassword(index)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Users;
