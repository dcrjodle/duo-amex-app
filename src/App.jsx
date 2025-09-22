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
  return (
    <div className="min-h-screen p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
          Expense Tracker
        </h1>

        <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
        <DocumentReader setExpenses={setExpenses} />
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

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

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

  // Shared expenses totals by person
  const sharedExpensesByPerson = expenses.reduce((acc, exp) => {
    if (!acc[exp.person]) {
      acc[exp.person] = { "Shared (40/60)": 0, "Shared (50/50)": 0 };
    }
    if (
      exp.category === "Shared (40/60)" ||
      exp.category === "Shared (50/50)"
    ) {
      acc[exp.person][exp.category] += exp.amount;
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
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <select
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="number"
              name="amount"
              placeholder="Amount"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
            />
            <select
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2 lg:col-span-1"
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
            />
            <input
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Shared Expenses
        </h2>
        <p className="mb-6">Expenses that should be split between partners.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sharedExpensesByPersonEntries.length > 0 &&
            sharedExpensesByPersonEntries.map(([person, amounts]) => (
              <div
                key={person}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg"
              >
                <h3 className="text-lg font-semibold mb-4">
                  {person.split(" ")[0] === "CARL"
                    ? "JOEL"
                    : person.split(" ")[0]}
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
                  <div className="border-t border-white/20 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-3xl font-bold">
                        {(
                          amounts["Shared (40/60)"] + amounts["Shared (50/50)"]
                        ).toFixed(2)} kr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          {!sharedExpensesByPersonEntries.length && (
            <div className=" text-gray-500 mb-2">No shared expenses found.</div>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Total Expenses</h3>
          <p className="text-3xl font-bold mt-2">{totalAmount.toFixed(2)} kr</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Transactions</h3>
          <p className="text-3xl font-bold mt-2">{expenses.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Average</h3>
          <p className="text-3xl font-bold mt-2">
            {expenses.length
              ? (totalAmount / expenses.length).toFixed(2)
              : "0.00"} kr
          </p>
        </div>
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
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">All Expenses</h2>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-4">
          {expenses.map((exp, index) => (
            <div key={exp.id} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">{exp.date}</div>
                  <div className="font-semibold text-lg">
                    {exp.amount.toFixed(2)} kr
                  </div>
                </div>
                <button
                  onClick={() => deleteExpense(exp.id)}
                  className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded transition"
                >
                  ✕
                </button>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {exp.person.split(" ")[0]}
                </span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    exp.category === "Personal"
                      ? "bg-blue-100 text-blue-800"
                      : exp.category === "Shared (40/60)"
                      ? "bg-green-100 text-green-800"
                      : exp.category === "Shared (50/50)"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {exp.category}
                </span>
              </div>
              {exp.description && (
                <div className="text-sm text-gray-600">{exp.description}</div>
              )}
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No expenses yet
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Person
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((exp, index) => (
                <tr
                  key={exp.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {exp.date}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {exp.person.split(" ")[0]}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {exp.amount.toFixed(2)} kr
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        exp.category === "Personal"
                          ? "bg-blue-100 text-blue-800"
                          : exp.category === "Shared (40/60)"
                          ? "bg-green-100 text-green-800"
                          : exp.category === "Shared (50/50)"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {exp.description || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-1 rounded transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No expenses yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentReader({ setExpenses }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  function parseCsvDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split("T")[0]; // fallback
    const [month, day, year] = dateStr.split("/"); // MM/DD/YYYY
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage("");
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;

        // Filter rows that match food merchants
        const foodRows = rows.filter((row) => {
          const merchant = row.Beskrivning?.toLowerCase() || "";
          return FOOD_MERCHANTS.some((f) => merchant.includes(f));
        });

        if (foodRows.length === 0) {
          setMessage("No food entries found in CSV.");
          setLoading(false);
          return;
        }

        try {
          for (const row of foodRows) {
            // Convert "17,90" to 17.9
            const amount = parseFloat(row.Belopp.replace(",", "."));

            const { error } = await supabase.from("expenses").insert([
              {
                person: row.Kortmedlem || "me", // card member
                amount,
                category: "Shared (50/50)",
                description: row.Beskrivning,
                date: parseCsvDate(row.Datum),
              },
            ]);
            if (error) throw error;
            await loadExpenses(setExpenses, setLoading);
          }
          setMessage(
            `Inserted ${foodRows.length} shared food entries successfully.`
          );
        } catch (err) {
          console.error(err);
          setMessage("Error inserting data into Supabase.");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error(err);
        setMessage("Failed to parse CSV.");
        setLoading(false);
      },
    });
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Upload CSV</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Upload CSV for shared food expenses - works for {FOOD_MERCHANTS.join(", ")}
            </p>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="border-2 border-dashed border-gray-300 p-3 rounded-lg w-full mb-3 cursor-pointer hover:bg-gray-50 transition text-sm"
            />
            
            {loading && (
              <p className="text-indigo-600 text-sm">Processing...</p>
            )}
            {message && (
              <p className="text-gray-700 mt-2 text-sm">{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
