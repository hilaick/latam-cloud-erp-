import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { ERPProvider } from './context/ERPContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

const huaweiTheme = {
  token: {
    colorPrimary: '#E60012',
    colorPrimaryHover: '#C4000F',
    colorPrimaryActive: '#A8000D',
    colorError: '#E60012',
    colorErrorHover: '#C4000F',
    colorSuccess: '#00A18C',
    colorWarning: '#F24E1E',
    colorInfo: '#006CE3',
    colorTextBase: '#1F2D3D',
    colorText: '#1F2D3D',
    colorTextSecondary: '#4A5A6E',
    colorTextTertiary: '#8A8E99',
    colorTextQuaternary: '#C2C2C2',
    colorBorder: '#E4E7ED',
    colorBorderSecondary: '#EEEEEE',
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#262626',
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 4,
    borderRadiusXS: 4,
    fontFamily: "HuaweiSans, -apple-system, 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'STHeiti', 'Microsoft YaHei', 'Microsoft JhengHei', SimSun, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    lineHeight: 1.5715,
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    padding: 16,
    paddingSM: 12,
    paddingLG: 24,
    paddingXS: 8,
    paddingXXS: 4,
    margin: 16,
    marginSM: 12,
    marginLG: 24,
    marginXS: 8,
    marginXXS: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    boxShadowSecondary: '0 1px 4px rgba(0,0,0,0.08)',
    boxShadowTertiary: '0 4px 12px rgba(0,0,0,0.08)',
  },
  components: {
    Layout: {
      siderBg: '#1F2D3D',
      triggerBg: '#2A3A4D',
      triggerColor: '#E8E8E8',
    },
    Menu: {
      darkItemBg: '#1F2D3D',
      darkSubMenuItemBg: '#2A3A4D',
      darkItemColor: '#E8E8E8',
      darkItemSelectedBg: '#E60012',
      darkItemHoverBg: '#2A3A4D',
    },
    Table: {
      headerBg: '#F5F7FA',
      headerColor: '#1F2D3D',
      borderColor: '#E4E7ED',
      rowHoverBg: '#F5F7FA',
    },
    Button: {
      primaryShadow: '0 2px 8px rgba(230,0,18,0.25)',
      dangerShadow: '0 2px 8px rgba(230,0,18,0.25)',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ConfigProvider theme={huaweiTheme}>
      <AuthProvider>
        <ERPProvider>
          <App />
        </ERPProvider>
      </AuthProvider>
    </ConfigProvider>
)
