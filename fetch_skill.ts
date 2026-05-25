import axios from 'axios';
axios.get('https://insforge.dev/skill.md').then(res => console.log(res.data)).catch(console.error);
