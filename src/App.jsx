'use client'
import './App.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other']

export default function App() {
  return (
    <>
    <ExpenseTracker/>
    </>
  )
}

export function ExpenseTracker() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    person: '',
    amount: '',
    category: categories[0],
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
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
      await loadExpenses()
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  async function deleteExpense(id) {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      await loadExpenses()
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
        <input
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="text" name="person" placeholder="Person Name"
          value={formData.person} onChange={handleChange}
        />
        <input
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          type="number" name="amount" placeholder="Amount"
          value={formData.amount} onChange={handleChange}
        />
        <select
          className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
          name="category" value={formData.category} onChange={handleChange}>
          {categories.map((cat) => (
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

