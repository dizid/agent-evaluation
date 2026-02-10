<script setup>
import { ref, onMounted, computed } from 'vue'
import { useOrgContext } from '@/composables/useOrgContext.js'
import { useToast } from '@/composables/useToast.js'
import { getOrgMembers, inviteMember, removeMember, updateMemberRole } from '@/services/api.js'

const { currentOrg, orgSlug, canManageTeam, isOwner } = useOrgContext()
const toast = useToast()

const loading = ref(true)
const members = ref([])
const showInviteForm = ref(false)

// Invite form
const inviteEmail = ref('')
const inviteRole = ref('evaluator')

const roles = [
  { value: 'viewer', label: 'Viewer', description: 'Can view agents and evaluations' },
  { value: 'evaluator', label: 'Evaluator', description: 'Can evaluate agents' },
  { value: 'admin', label: 'Admin', description: 'Can manage agents and team' },
  { value: 'owner', label: 'Owner', description: 'Full control' }
]

const sortedMembers = computed(() => {
  return [...members.value].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, evaluator: 2, viewer: 3 }
    return roleOrder[a.role] - roleOrder[b.role]
  })
})

function getRoleBadgeClass(role) {
  const classes = {
    owner: 'bg-yellow-500/20 text-yellow-300',
    admin: 'bg-accent/20 text-accent',
    evaluator: 'bg-blue-500/20 text-blue-300',
    viewer: 'bg-gray-500/20 text-gray-300'
  }
  return classes[role] || classes.viewer
}

async function loadMembers() {
  loading.value = true
  try {
    const res = await getOrgMembers(orgSlug.value)
    members.value = res.members || []
  } catch (err) {
    toast.error('Failed to load team members')
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function handleInvite() {
  if (!inviteEmail.value || !inviteRole.value) {
    toast.error('Please provide email and role')
    return
  }

  try {
    await inviteMember(orgSlug.value, {
      email: inviteEmail.value,
      role: inviteRole.value
    })

    toast.success('Invitation sent')
    inviteEmail.value = ''
    inviteRole.value = 'evaluator'
    showInviteForm.value = false
    await loadMembers()
  } catch (err) {
    toast.error(err.message || 'Failed to send invitation')
  }
}

async function handleRemove(userId, userName) {
  if (!confirm(`Remove ${userName} from the team?`)) return

  try {
    await removeMember(orgSlug.value, userId)
    toast.success('Member removed')
    await loadMembers()
  } catch (err) {
    toast.error(err.message || 'Failed to remove member')
  }
}

async function handleRoleChange(userId, newRole) {
  try {
    await updateMemberRole(orgSlug.value, userId, newRole)
    toast.success('Role updated')
    await loadMembers()
  } catch (err) {
    toast.error(err.message || 'Failed to update role')
  }
}

onMounted(loadMembers)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-text-primary mb-2">Team Management</h1>
        <p class="text-text-secondary">{{ currentOrg?.name }}</p>
      </div>
      <button
        v-if="canManageTeam"
        @click="showInviteForm = !showInviteForm"
        class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
      >
        {{ showInviteForm ? 'Cancel' : 'Invite Member' }}
      </button>
    </div>

    <!-- Invite form -->
    <div v-if="showInviteForm" class="glass-card p-6 mb-6">
      <h3 class="text-lg font-semibold text-text-primary mb-4">Invite Team Member</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Email</label>
          <input
            v-model="inviteEmail"
            type="email"
            placeholder="colleague@example.com"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Role</label>
          <select
            v-model="inviteRole"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
          >
            <option
              v-for="role in roles.filter(r => r.value !== 'owner')"
              :key="role.value"
              :value="role.value"
            >
              {{ role.label }} - {{ role.description }}
            </option>
          </select>
        </div>
        <button
          @click="handleInvite"
          class="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
        >
          Send Invitation
        </button>
      </div>
    </div>

    <!-- Members list -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="glass-card p-6 h-24 animate-pulse"></div>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="member in sortedMembers"
        :key="member.user_id"
        class="glass-card p-6"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <div class="text-text-primary font-semibold">{{ member.name || member.email }}</div>
              <span
                class="px-2 py-1 rounded text-xs font-semibold uppercase"
                :class="getRoleBadgeClass(member.role)"
              >
                {{ member.role }}
              </span>
            </div>
            <div class="text-text-muted text-sm">{{ member.email }}</div>
          </div>

          <!-- Actions -->
          <div v-if="canManageTeam && member.role !== 'owner'" class="flex items-center space-x-3">
            <select
              :value="member.role"
              @change="handleRoleChange(member.user_id, $event.target.value)"
              class="px-3 py-1 bg-eval-surface border border-eval-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option
                v-for="role in roles.filter(r => r.value !== 'owner' || isOwner)"
                :key="role.value"
                :value="role.value"
              >
                {{ role.label }}
              </option>
            </select>
            <button
              @click="handleRemove(member.user_id, member.name || member.email)"
              class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div v-if="members.length === 0" class="glass-card p-12 text-center">
        <p class="text-text-muted">No team members yet. Invite someone to get started.</p>
      </div>
    </div>
  </div>
</template>
