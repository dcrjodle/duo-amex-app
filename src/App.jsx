'use client'
import './index.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Papa from 'papaparse'

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other']
const PEOPLE = ['ANA TRAMOSLJANIN', 'CARL OLOF JOEL BYSTEDT']
const FOOD_MERCHANTS = ['lidl', 'coop', 'ica', 'hemkop']

export default function App() {
  const [expenses, setExpenses] = useState([])
  return (
    <>
    <DocumentReader setExpenses={setExpenses} />
    <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
    </>
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

  if (loading) return <div className="text-center text-gray-700">Loading expenses...</div>

  return (
    <div>
      {/* Form */}
      <h2 className="text-xl font-semibold mb-3">Add Expense</h2>
      <form onSubmit={handleSubmit} className="grid gap-3 mb-6">
        <select
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          name="person" value={formData.person} onChange={handleChange}>
          {PEOPLE.map((person) => (
            <option key={person} value={person}>{person}</option>
          ))}
          </select>
        <input
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="number" name="amount" placeholder="Amount"
          value={formData.amount} onChange={handleChange}
        />
        <select
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          name="category" value={formData.category} onChange={handleChange}>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="text" name="description" placeholder="Description"
          value={formData.description} onChange={handleChange}
        />
        <input
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="date" name="date" value={formData.date} onChange={handleChange}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
        >
          Add Expense
        </button>
      </form>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-600 text-white p-4 rounded-md shadow">
          <h3 className="text-sm opacity-80">Total Expenses</h3>
          <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-md shadow">
          <h3 className="text-sm opacity-80">Number of Transactions</h3>
          <p className="text-2xl font-bold">{expenses.length}</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-md shadow">
          <h3 className="text-sm opacity-80">Average Transaction</h3>
          <p className="text-2xl font-bold">
            ${expenses.length ? (totalAmount / expenses.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Per Person */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Person Totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(personTotals).map(([person, amount]) => (
            <div key={person} className="bg-gray-100 p-2 rounded-md flex justify-between">
              <span>{person}</span>
              <span>${amount.toFixed(2)}</span>
            </div>
          ))}
          {Object.keys(personTotals).length === 0 && <p>No expenses yet</p>}
        </div>
      </div>

      {/* Per Category */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Category Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <div key={category} className="bg-gray-100 p-2 rounded-md flex justify-between">
              <span>{category}</span>
              <span>${amount.toFixed(2)}</span>
            </div>
          ))}
          {Object.keys(categoryTotals).length === 0 && <p>No expenses yet</p>}
        </div>
      </div>

      {/* Expenses List */}
      <h2 className="text-xl font-semibold mb-3">Expenses</h2>
      {expenses.length === 0 && <p className="text-gray-700">No expenses yet</p>}
      <ul className="space-y-2">
        {expenses.map((exp) => (
          <li
            key={exp.id}
            className="flex justify-between items-center p-2 bg-gray-100 rounded-md shadow-sm"
          >
            <span>
              {exp.person} - ${exp.amount} - {exp.category} - {exp.date} - {exp.description || '-'}
            </span>
            <button
              onClick={() => deleteExpense(exp.id)}
              className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocumentReader({ setExpenses }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function parseCsvDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0] // fallback
  const [month, day, year] = dateStr.split('/') // MM/DD/YYYY
  return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
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
    <div className="bg-white p-4 rounded-md shadow-md mx-auto mb-6">
      <h2 className="text-lg font-semibold mb-3">{`Upload CSV for Food Expenses - works for ${FOOD_MERCHANTS.join(', ')}`}</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="border p-2 rounded-md w-full mb-3 cursor-pointer hover:bg-gray-100"
      />
      {loading && <p className="text-indigo-600">Processing...</p>}
      {message && <p className="text-gray-700">{message}</p>}
    </div>
  )
}


