"use client";
import "./index.css";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CATEGORIES = ["Personal", "Shared (40/60)", "Shared (50/50)"];
const PEOPLE = ["ANA TRAMOSLJANIN", "CARL OLOF JOEL BYSTEDT"];
const FOOD_MERCHANTS = ["lidl", "coop", "ica", "hemkop"];

const COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#6B7280",
];

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Expense Tracker
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              aria-label="Toggle dark mode"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
          <DocumentReader setExpenses={setExpenses} expenses={expenses} />
        </div>
      </div>
    </div>
  );
}

async function loadExpenses(setExpenses, setLoading) {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setExpenses(data || []);
  } catch (error) {
    console.error("Error loading expenses:", error);
  } finally {
    setLoading(false);
  }
}

export function ExpenseTracker({ expenses, setExpenses }) {
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [personFilter, setPersonFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [formData, setFormData] = useState({
    person: PEOPLE[0],
    amount: "",
    category: CATEGORIES[0],
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadExpenses(setExpenses, setLoading);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.person || !formData.amount) {
      alert("Please fill in name and amount");
      return;
    }

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          person: formData.person,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date,
        },
      ]);
      if (error) throw error;
      setFormData({ ...formData, amount: "", description: "" });
      await loadExpenses(setExpenses, setLoading);
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  }

  async function deleteExpense(id) {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      await loadExpenses(setExpenses, setLoading);
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  }

  async function deleteAllExpenses() {
    if (!window.confirm("Are you sure you want to delete ALL expenses? This cannot be undone.")) {
      return;
    }
    try {
      const { error } = await supabase.from("expenses").delete().not("id", "is", null);
      if (error) throw error;
      await loadExpenses(setExpenses, setLoading);
    } catch (error) {
      console.error("Error deleting all expenses:", error);
    }
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setEditData({ ...expense });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveEdit() {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          person: editData.person,
          amount: parseFloat(editData.amount),
          category: editData.category,
          description: editData.description,
          date: editData.date,
        })
        .eq("id", editingId);
      if (error) throw error;
      await loadExpenses(setExpenses, setLoading);
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error("Error updating expense:", error);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSort(key) {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  const uniqueCategories = [...new Set(expenses.map(exp => exp.category))];

  const filteredExpenses = expenses.filter(exp => {
    const personMatch = personFilter === "All" || exp.person === personFilter;
    const categoryMatch = categoryFilter === "All" || exp.category === categoryFilter;
    return personMatch && categoryMatch;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'amount') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Calculate statistics
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const personTotals = expenses.reduce((acc, exp) => {
    acc[exp.person] = (acc[exp.person] || 0) + exp.amount;
    return acc;
  }, {});
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  // Shared expenses totals by person (including personal for Ana)
  const sharedExpensesByPerson = expenses.reduce((acc, exp) => {
    if (!acc[exp.person]) {
      acc[exp.person] = { "Shared (40/60)": 0, "Shared (50/50)": 0, "Personal": 0 };
    }
    if (
      exp.category === "Shared (40/60)" ||
      exp.category === "Shared (50/50)"
    ) {
      acc[exp.person][exp.category] += exp.amount;
    }
    // Track personal expenses for Ana only
    if (exp.category === "Personal" && exp.person === "ANA TRAMOSLJANIN") {
      acc[exp.person]["Personal"] += exp.amount;
    }
    return acc;
  }, {});

  // Prepare chart data
  const chartData = Object.entries(categoryTotals).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
      amount: amount,
    })
  );

  const personChartData = Object.entries(personTotals).map(
    ([person, amount]) => ({
      name: person.split(" ")[0], // First name only for chart
      amount: amount,
    })
  );

  if (loading)
    return <div className="text-center text-gray-700">Loading expenses...</div>;

  const sharedExpensesByPersonEntries = Object.entries(sharedExpensesByPerson);

  return (
    <div className="space-y-8">
      {/* Add Expense Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-colors">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Add New Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <select
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              name="person"
              value={formData.person}
              onChange={handleChange}
            >
              {PEOPLE.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
            <input
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              type="number"
              name="amount"
              placeholder="Amount"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
            />
            <select
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2 lg:col-span-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
            />
            <input
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-indigo-600 text-white py-3 px-8 rounded-lg hover:bg-indigo-700 transition font-semibold text-lg"
          >
            Add Expense
          </button>
        </form>
      </div>
      {/* Most Important Stats - Shared Expenses by Person */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-colors">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Expense Summary
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Expenses that should be split between partners.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sharedExpensesByPersonEntries.length > 0 &&
            sharedExpensesByPersonEntries.map(([person, amounts]) => {
              const isAna = person === 'ANA TRAMOSLJANIN';
              const isJoel = person === 'CARL OLOF JOEL BYSTEDT';
              // Don't show Joel's personal expenses in the card
              const showPersonal = isAna && amounts["Personal"] > 0;
              const totalShared = amounts["Shared (40/60)"] + amounts["Shared (50/50)"];
              const totalAll = totalShared + (showPersonal ? amounts["Personal"] : 0);

              return (
                <div
                  key={person}
                  className={`bg-gradient-to-br ${isAna ? 'from-pink-500 to-rose-600' : 'from-blue-500 to-indigo-600'} text-white p-6 rounded-xl shadow-lg`}
                >
                  <h3 className="text-lg font-semibold mb-4">
                    {person.split(" ")[0] === "CARL" ? "JOEL" : person.split(" ")[0]}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        💰 Shared (40/60)
                      </span>
                      <span className="text-2xl font-bold">
                        {amounts["Shared (40/60)"].toFixed(2)} kr
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        🤝 Shared (50/50)
                      </span>
                      <span className="text-2xl font-bold">
                        {amounts["Shared (50/50)"].toFixed(2)} kr
                      </span>
                    </div>
                    {showPersonal && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          🛍️ Personal
                        </span>
                        <span className="text-2xl font-bold">
                          {amounts["Personal"].toFixed(2)} kr
                        </span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="text-3xl font-bold">
                          {totalAll.toFixed(2)} kr
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm opacity-90">
                        <span>joel gets:</span>
                        <span className="font-semibold">
                          {(
                            amounts["Shared (40/60)"] * 0.4 +
                            amounts["Shared (50/50)"] * 0.5 +
                            (isAna ? amounts["Personal"] : 0)
                          ).toFixed(2)} kr
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          {!sharedExpensesByPersonEntries.length && (
            <div className=" text-gray-500 mb-2">No shared expenses found.</div>
          )}
        </div>
      </div>

      {/* Spending Trends Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-colors">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Spending Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={(() => {
            const sorted = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
            const grouped = sorted.reduce((acc, exp) => {
              const date = exp.date;
              if (!acc[date]) {
                acc[date] = { date, amount: 0 };
              }
              acc[date].amount += exp.amount;
              return acc;
            }, {});
            return Object.values(grouped);
          })()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value.toFixed(2)} kr`, 'Amount']} />
            <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts */}
      {/* Category Breakdown Pie Chart */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => window.innerWidth < 640 ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={window.innerWidth < 640 ? 60 : 80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        </div>*/}

      {/* Person Spending Bar Chart */}
      {/*<div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Spending by Person</h2>
          <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
            <BarChart data={personChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: window.innerWidth < 640 ? 12 : 14 }}
                interval={0}
              />
              <YAxis tick={{ fontSize: window.innerWidth < 640 ? 12 : 14 }} />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
              <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> */}

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Expenses</h2>
          {expenses.length > 0 && (
            <button
              onClick={deleteAllExpenses}
              className="text-red-600 hover:text-white hover:bg-red-600 border border-red-600 px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              Delete All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Person:</label>
            <select
              aria-label="Person Filter"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="All">All ({expenses.length})</option>
              {PEOPLE.map((person) => (
                <option key={person} value={person}>
                  {person.split(" ")[0]} ({expenses.filter(e => e.person === person).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</label>
            <select
              aria-label="Category Filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="All">All ({expenses.length})</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category} ({expenses.filter(e => e.category === category).length})
                </option>
              ))}
            </select>
          </div>

          {(personFilter !== "All" || categoryFilter !== "All") && (
            <button
              onClick={() => {
                setPersonFilter("All");
                setCategoryFilter("All");
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear Filters
            </button>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            Showing {sortedExpenses.length} of {expenses.length} expenses
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-4">
          {sortedExpenses.map((exp, index) => (
            <div key={exp.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{exp.date}</div>
                  <div className="font-semibold text-lg text-gray-900 dark:text-white">
                    {exp.amount.toFixed(2)} kr
                  </div>
                </div>
                <button
                  onClick={() => startEdit(exp)}
                  className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900 p-2 rounded transition mr-2"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteExpense(exp.id)}
                  className="text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-900 p-2 rounded transition"
                >
                  ✕
                </button>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {exp.person.split(" ")[0]}
                </span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    exp.category === "Personal"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : exp.category === "Shared (40/60)"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : exp.category === "Shared (50/50)"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {exp.category}
                </span>
              </div>
              {exp.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400">{exp.description}</div>
              )}
            </div>
          ))}
          {sortedExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {expenses.length === 0 ? "No expenses yet" : "No expenses match the current filters"}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th
                  onClick={() => handleSort('date')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('person')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Person {sortConfig.key === 'person' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('description')}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedExpenses.map((exp, index) => (
                <tr
                  key={exp.id}
                  className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-750"}
                >
                  {editingId === exp.id ? (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <select
                          value={editData.person}
                          onChange={(e) => setEditData({ ...editData, person: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {PEOPLE.map((person) => (
                            <option key={person} value={person}>{person.split(" ")[0]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <input
                          type="number"
                          step="0.01"
                          value={editData.amount}
                          onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <select
                          value={editData.category}
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={saveEdit}
                          className="text-green-600 hover:text-green-900 hover:bg-green-50 dark:hover:bg-green-900 px-3 py-1 rounded transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1 rounded transition"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {exp.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {exp.person.split(" ")[0]}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {exp.amount.toFixed(2)} kr
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            exp.category === "Personal"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : exp.category === "Shared (40/60)"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : exp.category === "Shared (50/50)"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {exp.description || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => startEdit(exp)}
                          className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900 px-3 py-1 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-900 px-3 py-1 rounded transition"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {sortedExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {expenses.length === 0 ? "No expenses yet" : "No expenses match the current filters"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentReader({ setExpenses, expenses }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: categorize, 3: finish
  const [parsedEntries, setParsedEntries] = useState([]);
  const [personFilter, setPersonFilter] = useState("All");

  function parseCsvDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split("T")[0]; // fallback
    const [month, day, year] = dateStr.split("/"); // MM/DD/YYYY
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const uniqueCategories = expenses.length > 0
    ? [...new Set(expenses.map(exp => exp.category))]
    : CATEGORIES;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage("");
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;

        // Parse all rows (not just food merchants)
        const entries = rows.map((row, index) => ({
          id: index,
          person: row.Kortmedlem || "Unknown",
          amount: parseFloat(row.Belopp?.replace(",", ".")) || 0,
          description: row.Beskrivning || "",
          date: parseCsvDate(row.Datum),
          category: uniqueCategories[0] || "Personal", // default to first available category
          originalRow: row
        })).filter(entry => entry.amount !== 0 && entry.description); // filter out invalid entries

        if (entries.length === 0) {
          setMessage("No valid entries found in CSV.");
          setLoading(false);
          return;
        }

        setParsedEntries(entries);
        setStep(2);
        setLoading(false);
        setMessage(`Found ${entries.length} entries. Please categorize each one.`);
      },
      error: (err) => {
        console.error(err);
        setMessage("Failed to parse CSV.");
        setLoading(false);
      },
    });
  };

  const updateEntryCategory = (entryId, category) => {
    setParsedEntries(entries => 
      entries.map(entry => 
        entry.id === entryId ? { ...entry, category } : entry
      )
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    setMessage("");

    const entriesToAdd = personFilter === "All"
      ? parsedEntries
      : parsedEntries.filter(entry => entry.person === personFilter);

    try {
      for (const entry of entriesToAdd) {
        const { error } = await supabase.from("expenses").insert([{
          person: entry.person,
          amount: entry.amount,
          category: entry.category,
          description: entry.description,
          date: entry.date,
        }]);
        if (error) throw error;
      }

      await loadExpenses(setExpenses, setLoading);
      setMessage(`Successfully added ${entriesToAdd.length} entries!`);
      setStep(3);
    } catch (err) {
      console.error(err);
      setMessage("Error adding entries to database.");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setParsedEntries([]);
    setMessage("");
    setPersonFilter("All");
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Fixed Button in Corner */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition z-50"
        title="Upload CSV"
      >
        📄
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Import Wizard</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Step {step} of 3</p>
              </div>
              <button
                onClick={resetWizard}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Upload CSV File</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload your CSV file with expense data. All entries will be parsed and you can categorize each one.
                  </p>
                  
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg w-full mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Categorize Entries</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Review and categorize each entry before adding them to your expenses.
                  </p>

                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setPersonFilter("All")}
                      className={`px-4 py-2 rounded-lg transition ${
                        personFilter === "All"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      All ({parsedEntries.length})
                    </button>
                    {PEOPLE.map((person) => (
                      <button
                        key={person}
                        onClick={() => setPersonFilter(person)}
                        className={`px-4 py-2 rounded-lg transition ${
                          personFilter === person
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {person.split(" ")[0]} ({parsedEntries.filter(e => e.person === person).length})
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {parsedEntries.filter(entry =>
                      personFilter === "All" || entry.person === personFilter
                    ).map((entry) => (
                      <div key={entry.id} className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">{entry.amount.toFixed(2)} kr</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{entry.date} • {entry.person}</div>
                          </div>
                          <select
                            value={entry.category}
                            onChange={(e) => updateEntryCategory(entry.id, e.target.value)}
                            className="ml-4 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            {uniqueCategories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center">
                  <div className="text-green-600 text-4xl mb-4">✓</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Import Complete!</h3>
                  <p className="text-gray-600 dark:text-gray-400">All entries have been successfully added to your expenses.</p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="text-indigo-600 dark:text-indigo-400">Processing...</div>
                </div>
              )}
              
              {message && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-800 dark:text-blue-200">
                  {message}
                </div>
              )}
            </div>

            <div className="border-t dark:border-gray-700 p-6 flex justify-between">
              <div>
                {step > 1 && step < 3 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    ← Back
                  </button>
                )}
              </div>
              <div>
                {step === 2 && (
                  <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition"
                  >
                    {personFilter === "All"
                      ? `Add All ${parsedEntries.length} Entries`
                      : `Add ${parsedEntries.filter(e => e.person === personFilter).length} Entries (${personFilter.split(" ")[0]})`}
                  </button>
                )}
                {step === 3 && (
                  <button
                    onClick={resetWizard}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
