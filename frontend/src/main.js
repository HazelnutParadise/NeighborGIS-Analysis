import { getEl } from './dom.js';

// 設定logo圖片
import logoUrlFromFile from './assets/logo.svg';
getEl('#logo-img').src = logoUrlFromFile;

// 初始化各模組
import './chain1/chain1.js';
import './chain4/floor_plan.js';


import './left_right_btn.js';
import './switch_page.js';
import addStarOnRequiredInputs from './required_input.js';
addStarOnRequiredInputs();