'use client'
import './index.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Papa from 'papaparse'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other']
const PEOPLE = ['ANA TRAMOSLJANIN', 'CARL OLOF JOEL BYSTEDT']
const FOOD_MERCHANTS = ['lidl', 'coop', 'ica', 'hemkop']

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6B7280']

export default function App() {
  const [expenses, setExpenses] = useState([])
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Expense Tracker</h1>

        <DocumentReader setExpenses={setExpenses} />
        <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
      </div>
    </div>
  )
}

async function loadExpenses(setExpenses, setLoading) {
  try {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    setExpenses(data || [])
  } catch (error) {
    console.error('Error loading expenses:', error)
  } finally {
    setLoading(false)
  }
}

export function ExpenseTracker({ expenses, setExpenses }) {
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    person: PEOPLE[0],
    amount: '',
    category: CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadExpenses(setExpenses, setLoading)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.person || !formData.amount) {
      alert('Please fill in name and amount')
      return
    }

    try {
      const { error } = await supabase.from('expenses').insert([{
        person: formData.person,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      }])
      if (error) throw error
      setFormData({ ...formData, amount: '', description: '' })
      await loadExpenses(setExpenses, setLoading)
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  async function deleteExpense(id) {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      await loadExpenses(setExpenses, setLoading)
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Calculate statistics
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const personTotals = expenses.reduce((acc, exp) => {
    acc[exp.person] = (acc[exp.person] || 0) + exp.amount
    return acc
  }, {})
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {})

  // Food and Transport totals by person
  const foodTransportByPerson = expenses.reduce((acc, exp) => {
    if (!acc[exp.person]) {
      acc[exp.person] = { Food: 0, Transport: 0 }
    }
    if (exp.category === 'Food' || exp.category === 'Transport') {
      acc[exp.person][exp.category] += exp.amount
    }
    return acc
  }, {})

  // Prepare chart data
  const chartData = Object.entries(categoryTotals).map(([category, amount]) => ({
    name: category,
    value: amount,
    amount: amount
  }))

  const personChartData = Object.entries(personTotals).map(([person, amount]) => ({
    name: person.split(' ')[0], // First name only for chart
    amount: amount
  }))

  if (loading) return <div className="text-center text-gray-700">Loading expenses...</div>

  const foodTransportByPersonEntries = Object.entries(foodTransportByPerson);

  return (
    <div className="space-y-8">
      {/* Most Important Stats - Food & Transport by Person */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Food & Transport Spending</h2>
        <p className='mb-6'>Should be divided between the people in the group.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {foodTransportByPersonEntries.length > 0 && foodTransportByPersonEntries.map(([person, amounts]) => (
            <div key={person} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4">{person.split(' ')[0] === 'CARL' ? 'JOEL' : person.split(' ')[0]}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    🍽️ Food
                  </span>
                  <span className="text-2xl font-bold">${amounts.Food.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    🚗 Transport
                  </span>
                  <span className="text-2xl font-bold">${amounts.Transport.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/20 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-3xl font-bold">${(amounts.Food + amounts.Transport).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!foodTransportByPersonEntries.length && (
            <div className=" text-gray-500 mb-2">No expenses found for Food & Transport.</div>
          )}
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            name="person" value={formData.person} onChange={handleChange}>
            {PEOPLE.map((person) => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
          <input
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            type="number" name="amount" placeholder="Amount" step="0.01"
            value={formData.amount} onChange={handleChange}
          />
          <select
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            name="category" value={formData.category} onChange={handleChange}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            type="text" name="description" placeholder="Description"
            value={formData.description} onChange={handleChange}
          />
          <input
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            type="date" name="date" value={formData.date} onChange={handleChange}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Add Expense
          </button>
        </form>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Total Expenses</h3>
          <p className="text-3xl font-bold mt-2">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Transactions</h3>
          <p className="text-3xl font-bold mt-2">{expenses.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-sm opacity-90 font-medium">Average</h3>
          <p className="text-3xl font-bold mt-2">
            ${expenses.length ? (totalAmount / expenses.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
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
        </div>

        {/* Person Spending Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Spending by Person</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={personChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
              <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">All Expenses</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((exp, index) => (
                <tr key={exp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{exp.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{exp.person.split(' ')[0]}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${exp.amount.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${exp.category === 'Food' ? 'bg-green-100 text-green-800' :
                        exp.category === 'Transport' ? 'bg-blue-100 text-blue-800' :
                          exp.category === 'Entertainment' ? 'bg-purple-100 text-purple-800' :
                            exp.category === 'Utilities' ? 'bg-yellow-100 text-yellow-800' :
                              exp.category === 'Shopping' ? 'bg-pink-100 text-pink-800' :
                                exp.category === 'Health' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                      }`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{exp.description || '-'}</td>
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
            <div className="text-center py-8 text-gray-500">No expenses yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DocumentReader({ setExpenses }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function parseCsvDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0] // fallback
    const [month, day, year] = dateStr.split('/') // MM/DD/YYYY
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setMessage('')
    setLoading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data

        // Filter rows that match food merchants
        const foodRows = rows.filter(row => {
          const merchant = row.Beskrivning?.toLowerCase() || ''
          return FOOD_MERCHANTS.some(f => merchant.includes(f))
        })

        if (foodRows.length === 0) {
          setMessage('No FOOD entries found in CSV.')
          setLoading(false)
          return
        }

        try {
          for (const row of foodRows) {
            // Convert "17,90" to 17.9
            const amount = parseFloat(row.Belopp.replace(',', '.'))

            const { error } = await supabase.from('expenses').insert([{
              person: row.Kortmedlem || 'me', // card member
              amount,
              category: 'Food',
              description: row.Beskrivning,
              date: parseCsvDate(row.Datum)
            }])
            if (error) throw error
            await loadExpenses(setExpenses, setLoading)
          }
          setMessage(`Inserted ${foodRows.length} FOOD entries successfully.`)
        } catch (err) {
          console.error(err)
          setMessage('Error inserting data into Supabase.')
        } finally {
          setLoading(false)
        }
      },
      error: (err) => {
        console.error(err)
        setMessage('Failed to parse CSV.')
        setLoading(false)
      }
    })
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
      <h2 className="text-lg font-semibold mb-3">{`Upload CSV for Food Expenses - works for ${FOOD_MERCHANTS.join(', ')}`}</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="border-2 border-dashed border-gray-300 p-4 rounded-lg w-full mb-3 cursor-pointer hover:bg-gray-50 transition"
      />
      {loading && <p className="text-indigo-600">Processing...</p>}
      {message && <p className="text-gray-700 mt-2">{message}</p>}
    </div>
  )
}