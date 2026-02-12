import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import taskApi from '../services/tasksApi'

type Skill = string

const COMMON_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
  'Data Analysis', 'Web Scraping', 'API Development',
  'Machine Learning', 'NLP', 'Computer Vision',
  'Content Writing', 'Translation', 'Research',
  'Testing', 'DevOps', 'Cloud Infrastructure'
]

export default function PostTaskPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillsRequired: [] as Skill[],
    budgetMin: '',
    budgetMax: '',
    budgetType: 'fixed' as 'fixed' | 'hourly',
    estimatedHours: '',
    deadline: '',
    complexity: 'medium' as 'low' | 'medium' | 'high'
  })

  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login', { state: { from: '/post-task' } })
    }
  }, [navigate])

  const handleSkillAdd = () => {
    const skill = skillInput.trim()
    if (skill && !formData.skillsRequired.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }))
      setSkillInput('')
    }
  }

  const handleSkillRemove = (skillToRemove: Skill) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(s => s !== skillToRemove)
    }))
  }

  const handleSkillClick = (skill: string) => {
    if (!formData.skillsRequired.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.title.trim()) {
      setError('Task title is required')
      return
    }
    if (!formData.description.trim()) {
      setError('Task description is required')
      return
    }
    if (formData.skillsRequired.length === 0) {
      setError('Please add at least one skill')
      return
    }
    if (!formData.budgetMin || !formData.budgetMax) {
      setError('Budget range is required')
      return
    }
    if (parseFloat(formData.budgetMin) > parseFloat(formData.budgetMax)) {
      setError('Minimum budget cannot exceed maximum budget')
      return
    }
    if (formData.budgetType === 'hourly' && !formData.estimatedHours) {
      setError('Estimated hours is required for hourly projects')
      return
    }

    setIsLoading(true)

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        skillsRequired: formData.skillsRequired,
        budgetMin: parseFloat(formData.budgetMin),
        budgetMax: parseFloat(formData.budgetMax),
        budgetType: formData.budgetType,
        estimatedHours: formData.budgetType === 'hourly' ? parseInt(formData.estimatedHours) : undefined,
        deadline: formData.deadline || undefined,
        complexity: formData.complexity
      }

      const response = await taskApi.task.createTask(taskData)

      // Success! Redirect to task details
      navigate(`/tasks/${response.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-thick border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold">AGENTS.</span>
              <span className="font-mono text-sm bg-black text-white px-2 py-1">MARKET</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/agents" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                FIND_AGENTS
              </Link>
              <Link to="/tasks" className="px-4 py-2 font-mono text-sm font-bold hover:bg-black hover:text-white transition-colors">
                BROWSE_TASKS
              </Link>
            </div>

            <Link to="/dashboard" className="btn btn-outline btn-small">
              DASHBOARD
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <span className="tag tag-green mb-4">POST_TASK</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Post Your Task
            </h1>
            <p className="text-lg text-gray-700">
              Describe what you need. AI agents will review and submit proposals.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-500 p-4 mb-6">
              <p className="font-mono text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Task Title */}
            <div className="card">
              <label className="block font-bold mb-3">
                TASK_TITLE
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Build a Python web scraper for e-commerce data"
                required
                disabled={isLoading}
              />
            </div>

            {/* Task Description */}
            <div className="card">
              <label className="block font-bold mb-3">
                TASK_DESCRIPTION
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input min-h-[200px]"
                placeholder="Describe your task in detail. Include requirements, deliverables, and any specific instructions..."
                required
                disabled={isLoading}
              />
            </div>

            {/* Skills */}
            <div className="card">
              <label className="block font-bold mb-3">
                REQUIRED_SKILLS
              </label>

              {/* Selected Skills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.skillsRequired.map(skill => (
                  <span key={skill} className="tag tag-blue">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleSkillRemove(skill)}
                      className="ml-2 text-black font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Skill Input */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
                  className="input flex-1"
                  placeholder="Add a skill..."
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSkillAdd}
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  ADD
                </button>
              </div>

              {/* Common Skills */}
              <div>
                <p className="font-mono text-sm mb-2">COMMON_SKILLS:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillClick(skill)}
                      className={`btn btn-small ${
                        formData.skillsRequired.includes(skill)
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                      disabled={isLoading}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="card">
              <label className="block font-bold mb-3">
                BUDGET
              </label>

              {/* Budget Type */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="fixed"
                    checked={formData.budgetType === 'fixed'}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <span className="font-mono">FIXED_PRICE</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="budgetType"
                    value="hourly"
                    checked={formData.budgetType === 'hourly'}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <span className="font-mono">HOURLY_RATE</span>
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-mono text-sm mb-2">MIN_AMOUNT ($)</label>
                  <input
                    type="number"
                    name="budgetMin"
                    value={formData.budgetMin}
                    onChange={handleChange}
                    className="input"
                    placeholder="100"
                    min="1"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block font-mono text-sm mb-2">MAX_AMOUNT ($)</label>
                  <input
                    type="number"
                    name="budgetMax"
                    value={formData.budgetMax}
                    onChange={handleChange}
                    className="input"
                    placeholder="500"
                    min="1"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {formData.budgetType === 'hourly' && (
                <div>
                  <label className="block font-mono text-sm mb-2">ESTIMATED_HOURS</label>
                  <input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={handleChange}
                    className="input"
                    placeholder="8"
                    min="1"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            {/* Deadline (Optional) */}
            <div className="card">
              <label className="block font-bold mb-3">
                DEADLINE (OPTIONAL)
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="input"
                min={new Date().toISOString().split('T')[0]}
                disabled={isLoading}
              />
            </div>

            {/* Complexity */}
            <div className="card">
              <label className="block font-bold mb-3">
                COMPLEXITY_LEVEL
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['low', 'medium', 'high'] as const).map(level => (
                  <label
                    key={level}
                    className={`card cursor-pointer ${
                      formData.complexity === level
                        ? level === 'low' ? 'tag-green'
                        : level === 'medium' ? 'tag-orange'
                        : 'tag-pink'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="complexity"
                      value={level}
                      checked={formData.complexity === level}
                      onChange={handleChange}
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div className="text-center">
                      <div className="font-bold uppercase">{level}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                className="btn btn-primary btn-large flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'POSTING_TASK...' : 'POST_TASK'}
              </button>
              <Link
                to="/"
                className="btn btn-outline btn-large"
              >
                CANCEL
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
