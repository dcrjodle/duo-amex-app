'use client'
import './App.css'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Other']

export default function App() {
  // const [expenses, setExpenses] = useState([])
  // const [loading, setLoading] = useState(true)
  // const [submitting, setSubmitting] = useState(false)
  // const [error, setError] = useState(null)

  // const [formData, setFormData] = useState({
  //   person: '',
  //   amount: '',
  //   category: categories[0],
  //   description: '',
  //   date: new Date().toISOString().split('T')[0]
  // })

  // const [filterPerson, setFilterPerson] = useState('')
  // const [filterCategory, setFilterCategory] = useState('')
  // const [startDate, setStartDate] = useState('')
  // const [endDate, setEndDate] = useState('')

  // useEffect(() => {
  //   loadExpenses()
  // }, [])

  // async function loadExpenses() {
  //   try {
  //     setLoading(true)
  //     const { data, error } = await supabase
  //       .from('expenses')
  //       .select('*')
  //       .order('created_at', { ascending: false })

  //     if (error) throw error
  //     setExpenses(data || [])
  //   } catch (error) {
  //     console.error('Error loading expenses:', error)
  //     setError('Failed to load expenses. Please check your connection.')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // async function handleSubmit(e) {
  //   e.preventDefault()
  //   if (!formData.person || !formData.amount) {
  //     alert('Please fill in person name and amount')
  //     return
  //   }

  //   try {
  //     setSubmitting(true)
  //     const { error } = await supabase.from('expenses').insert([
  //       {
  //         person: formData.person,
  //         amount: parseFloat(formData.amount),
  //         category: formData.category,
  //         description: formData.description,
  //         date: formData.date,
  //       },
  //     ])

  //     if (error) throw error

  //     setFormData({
  //       person: formData.person,
  //       amount: '',
  //       category: categories[0],
  //       description: '',
  //       date: new Date().toISOString().split('T')[0],
  //     })

  //     await loadExpenses()
  //   } catch (error) {
  //     console.error('Error adding expense:', error)
  //     setError('Failed to add expense. Please try again.')
  //   } finally {
  //     setSubmitting(false)
  //   }
  // }

  // async function deleteExpense(id) {
  //   try {
  //     const { error } = await supabase.from('expenses').delete().eq('id', id)

  //     if (error) throw error
  //     await loadExpenses()
  //   } catch (error) {
  //     console.error('Error deleting expense:', error)
  //     setError('Failed to delete expense. Please try again.')
  //   }
  // }

  // function handleChange(e) {
  //   setFormData({
  //     ...formData,
  //     [e.target.name]: e.target.value,
  //   })
  // }

  // function clearFilters() {
  //   setFilterPerson('')
  //   setFilterCategory('')
  //   setStartDate('')
  //   setEndDate('')
  // }

  // const filteredExpenses = expenses.filter((expense) => {
  //   let match = true
  //   if (filterPerson && expense.person !== filterPerson) match = false
  //   if (filterCategory && expense.category !== filterCategory) match = false
  //   if (startDate && expense.date < startDate) match = false
  //   if (endDate && expense.date > endDate) match = false
  //   return match
  // })

  // const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  // const uniquePeople = [...new Set(expenses.map((exp) => exp.person))]

  // const personTotals = filteredExpenses.reduce((acc, exp) => {
  //   acc[exp.person] = (acc[exp.person] || 0) + exp.amount
  //   return acc
  // }, {})

  // const categoryTotals = filteredExpenses.reduce((acc, exp) => {
  //   acc[exp.category] = (acc[exp.category] || 0) + exp.amount
  //   return acc
  // }, {})

  // if (loading) {
  //   return <div className="loading">Loading expenses...</div>
  // }

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

  // Load expenses on mount
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
      const { error } = await supabase.from('expenses').insert([
        {
          person: formData.person,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date,
        },
      ])
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

  if (loading) return <div>Loading expenses...</div>

  return (
    <div>
      <h2>Add Expense</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="person"
          placeholder="Person Name"
          value={formData.person}
          onChange={handleChange}
        />
        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={formData.amount}
          onChange={handleChange}
        />
        <select name="category" value={formData.category} onChange={handleChange}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        />
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
        />
        <button type="submit">Add Expense</button>
      </form>

      <h2>Expenses</h2>
      {expenses.length === 0 && <p>No expenses yet</p>}
      <ul>
        {expenses.map((exp) => (
          <li key={exp.id}>
            {exp.person} - ${exp.amount} - {exp.category} - {exp.date} - {exp.description}{' '}
            <button onClick={() => deleteExpense(exp.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
