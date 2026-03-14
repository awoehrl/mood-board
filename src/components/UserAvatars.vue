<script setup>
defineProps({ users: Array, syncing: Boolean, connected: Boolean, boardId: String })
const emit = defineEmits(['copy-link'])

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="presence">
    <div class="avatars">
      <div
        v-for="user in users" :key="user.id"
        class="avatar" :style="{ background: user.color || '#9b9a97' }"
        :title="user.name"
      >{{ getInitials(user.name) }}</div>
    </div>

    <button class="share-btn" @click="emit('copy-link')">Share</button>
  </div>
</template>

<style scoped>
.presence { display: flex; align-items: center; gap: 8px; }
.avatars { display: flex; margin-left: -2px; }
.avatar {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: white;
  border: 2px solid var(--bg);
  margin-left: -4px;
}
.share-btn {
  height: 28px; padding: 0 10px;
  font-size: 12px; font-weight: 500;
  color: var(--text-secondary);
  border-radius: 6px;
}
.share-btn:hover { background: var(--hover); }
</style>
