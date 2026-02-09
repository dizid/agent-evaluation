import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RatingLabel from '@/components/ui/RatingLabel.vue'

describe('RatingLabel', () => {
  // ─── Label text rendering ─────────────────────────────────────────

  it('renders "Elite" label', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Elite' } })
    expect(wrapper.text()).toContain('Elite')
  })

  it('renders "Strong" label', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.text()).toContain('Strong')
  })

  it('renders "Adequate" label', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Adequate' } })
    expect(wrapper.text()).toContain('Adequate')
  })

  it('renders "Weak" label', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Weak' } })
    expect(wrapper.text()).toContain('Weak')
  })

  it('renders "Failing" label', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Failing' } })
    expect(wrapper.text()).toContain('Failing')
  })

  it('renders "Unrated" when label is null', () => {
    const wrapper = mount(RatingLabel, { props: { label: null } })
    expect(wrapper.text()).toContain('Unrated')
  })

  it('renders "Unrated" when no label prop given', () => {
    const wrapper = mount(RatingLabel)
    expect(wrapper.text()).toContain('Unrated')
  })

  // ─── Color classes ────────────────────────────────────────────────

  it('applies text-score-elite for Elite', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Elite' } })
    expect(wrapper.classes()).toContain('text-score-elite')
  })

  it('applies text-score-strong for Strong', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.classes()).toContain('text-score-strong')
  })

  it('applies text-score-adequate for Adequate', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Adequate' } })
    expect(wrapper.classes()).toContain('text-score-adequate')
  })

  it('applies text-score-weak for Weak', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Weak' } })
    expect(wrapper.classes()).toContain('text-score-weak')
  })

  it('applies text-score-failing for Failing', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Failing' } })
    expect(wrapper.classes()).toContain('text-score-failing')
  })

  it('applies text-text-muted for null/unknown label', () => {
    const wrapper = mount(RatingLabel, { props: { label: null } })
    expect(wrapper.classes()).toContain('text-text-muted')
  })

  // ─── Size variants ────────────────────────────────────────────────

  it('applies text-sm for md size (default)', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.classes()).toContain('text-sm')
  })

  it('applies text-xs for sm size', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong', size: 'sm' } })
    expect(wrapper.classes()).toContain('text-xs')
  })

  // ─── Icons ────────────────────────────────────────────────────────

  it('renders an icon for each known label', () => {
    for (const label of ['Elite', 'Strong', 'Adequate', 'Weak', 'Failing']) {
      const wrapper = mount(RatingLabel, { props: { label } })
      expect(wrapper.find('svg').exists()).toBe(true)
    }
  })

  it('does not render an icon for null label', () => {
    const wrapper = mount(RatingLabel, { props: { label: null } })
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  // ─── Accessibility ────────────────────────────────────────────────

  it('has role="status"', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('has aria-label with rating', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.attributes('aria-label')).toBe('Rating: Strong')
  })

  it('has aria-label "Rating: Unrated" when no label', () => {
    const wrapper = mount(RatingLabel, { props: { label: null } })
    expect(wrapper.attributes('aria-label')).toBe('Rating: Unrated')
  })

  // ─── Tooltip ──────────────────────────────────────────────────────

  it('shows tooltip with score range for Elite', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Elite' } })
    expect(wrapper.attributes('data-tooltip')).toContain('9.0-10.0')
  })

  it('shows tooltip with score range for Strong', () => {
    const wrapper = mount(RatingLabel, { props: { label: 'Strong' } })
    expect(wrapper.attributes('data-tooltip')).toContain('7.0-8.9')
  })

  it('shows "Not yet rated" tooltip for null label', () => {
    const wrapper = mount(RatingLabel, { props: { label: null } })
    expect(wrapper.attributes('data-tooltip')).toBe('Not yet rated')
  })
})
