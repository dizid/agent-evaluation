import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'

describe('ScoreBadge', () => {
  // ─── Score rendering ──────────────────────────────────────────────

  it('renders formatted score with one decimal', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.6 } })
    expect(wrapper.text()).toBe('7.6')
  })

  it('renders integer score with .0 suffix', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 8 } })
    expect(wrapper.text()).toBe('8.0')
  })

  it('renders "--" when score is null', () => {
    const wrapper = mount(ScoreBadge, { props: { score: null } })
    expect(wrapper.text()).toBe('--')
  })

  it('renders "--" when no score prop given (default)', () => {
    const wrapper = mount(ScoreBadge)
    expect(wrapper.text()).toBe('--')
  })

  // ─── Color classes by score tier ──────────────────────────────────

  it('applies elite color for score 9.0+', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 9.5 } })
    expect(wrapper.classes()).toContain('text-score-elite')
    expect(wrapper.classes()).toContain('bg-score-elite/10')
  })

  it('applies strong color for score 7.0-8.9', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.5 } })
    expect(wrapper.classes()).toContain('text-score-strong')
    expect(wrapper.classes()).toContain('bg-score-strong/10')
  })

  it('applies adequate color for score 5.0-6.9', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 5.5 } })
    expect(wrapper.classes()).toContain('text-score-adequate')
    expect(wrapper.classes()).toContain('bg-score-adequate/10')
  })

  it('applies weak color for score 3.0-4.9', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 3.5 } })
    expect(wrapper.classes()).toContain('text-score-weak')
    expect(wrapper.classes()).toContain('bg-score-weak/10')
  })

  it('applies failing color for score below 3.0', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 1.5 } })
    expect(wrapper.classes()).toContain('text-score-failing')
    expect(wrapper.classes()).toContain('bg-score-failing/10')
  })

  it('applies muted color for null score', () => {
    const wrapper = mount(ScoreBadge, { props: { score: null } })
    expect(wrapper.classes()).toContain('text-text-muted')
    expect(wrapper.classes()).toContain('bg-eval-card')
  })

  // ─── Size variants ────────────────────────────────────────────────

  it('applies sm size classes', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.0, size: 'sm' } })
    expect(wrapper.classes()).toContain('text-sm')
    expect(wrapper.classes()).toContain('px-2')
    expect(wrapper.classes()).toContain('py-0.5')
    expect(wrapper.classes()).toContain('rounded-md')
  })

  it('applies md size classes by default', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.0 } })
    expect(wrapper.classes()).toContain('text-base')
    expect(wrapper.classes()).toContain('px-3')
    expect(wrapper.classes()).toContain('py-1')
    expect(wrapper.classes()).toContain('rounded-lg')
    expect(wrapper.classes()).toContain('font-semibold')
  })

  it('applies lg size classes', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.0, size: 'lg' } })
    expect(wrapper.classes()).toContain('text-2xl')
    expect(wrapper.classes()).toContain('px-4')
    expect(wrapper.classes()).toContain('py-2')
    expect(wrapper.classes()).toContain('rounded-xl')
    expect(wrapper.classes()).toContain('font-bold')
  })

  // ─── Elite glow animation ─────────────────────────────────────────

  it('applies pulse-glow animation for elite scores', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 9.5 } })
    expect(wrapper.classes()).toContain('animate-pulse-glow')
  })

  it('does not apply pulse-glow for non-elite scores', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 8.0 } })
    expect(wrapper.classes()).not.toContain('animate-pulse-glow')
  })

  // ─── Accessibility ────────────────────────────────────────────────

  it('has role="status"', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.5 } })
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('has descriptive aria-label with score', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 7.5 } })
    expect(wrapper.attributes('aria-label')).toBe('Score 7.5 out of 10')
  })

  it('has fallback aria-label when no score', () => {
    const wrapper = mount(ScoreBadge, { props: { score: null } })
    expect(wrapper.attributes('aria-label')).toBe('Score not available')
  })

  // ─── Tooltip ──────────────────────────────────────────────────────

  it('shows tooltip with score and rating label', () => {
    const wrapper = mount(ScoreBadge, { props: { score: 9.0 } })
    expect(wrapper.attributes('data-tooltip')).toBe('Performance score: 9.0 / 10 (Elite)')
  })

  it('shows "No score yet" tooltip when null', () => {
    const wrapper = mount(ScoreBadge, { props: { score: null } })
    expect(wrapper.attributes('data-tooltip')).toBe('No score yet')
  })
})
