import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const timeZoneDetails = [
  { id: 'ET', name: 'Eastern Time (ET)', timeZone: 'America/New_York', color: 'bg-blue-500', mapFillClass: 'fill-blue-500', states: ['CT', 'DE', 'FL_east', 'GA', 'IN_east', 'KY_east', 'ME', 'MD', 'MA', 'MI_east', 'NH', 'NJ', 'NY', 'NC', 'OH', 'PA', 'RI', 'SC', 'TN_east', 'VT', 'VA', 'WV'] },
  { id: 'CT', name: 'Central Time (CT)', timeZone: 'America/Chicago', color: 'bg-green-500', mapFillClass: 'fill-green-500', states: ['AL', 'AR', 'FL_west', 'IL', 'IN_west', 'IA', 'KS', 'KY_west', 'LA', 'MI_west', 'MN', 'MS', 'MO', 'NE_central_east', 'ND_east', 'OK', 'SD_east', 'TN_central_west', 'TX', 'WI'] },
  { id: 'MT', name: 'Mountain Time (MT)', timeZone: 'America/Denver', color: 'bg-yellow-600', mapFillClass: 'fill-yellow-600', states: ['AZ_no_dst', 'CO', 'ID_south', 'KS_west', 'MT', 'NE_west', 'NM', 'ND_west', 'OR_east', 'SD_west', 'TX_west', 'UT', 'WY'] },
  { id: 'PT', name: 'Pacific Time (PT)', timeZone: 'America/Los_Angeles', color: 'bg-red-500', mapFillClass: 'fill-red-500', states: ['CA', 'ID_north', 'NV', 'OR_west', 'WA'] },
  { id: 'AKT', name: 'Alaska Time (AKT)', timeZone: 'America/Anchorage', color: 'bg-purple-500', mapFillClass: 'fill-purple-500', states: ['AK'] },
  { id: 'HT', name: 'Hawaii Time (HT)', timeZone: 'Pacific/Honolulu', color: 'bg-pink-500', mapFillClass: 'fill-pink-500', states: ['HI', 'AZ_hawaii'] }, 
];

const stateToTimeZoneMap = {};
timeZoneDetails.forEach(tz => {
  tz.states.forEach(state => {
    stateToTimeZoneMap[state] = tz.mapFillClass;
  });
});
// Arizona is a special case, mostly MST without DST. Some parts observe DST (Navajo Nation).
// For simplicity, we'll map AZ to MST. Parts of AZ align with Pacific during DST for other states.
stateToTimeZoneMap['AZ'] = 'fill-yellow-600'; // Mountain Time
// Florida split
stateToTimeZoneMap['FL'] = 'fill-blue-500'; // Primarily Eastern
// Indiana split
stateToTimeZoneMap['IN'] = 'fill-blue-500'; // Leans Eastern
// Kentucky split
stateToTimeZoneMap['KY'] = 'fill-blue-500'; // Leans Eastern
// Michigan split
stateToTimeZoneMap['MI'] = 'fill-blue-500'; // Leans Eastern
// Nebraska split
stateToTimeZoneMap['NE'] = 'fill-green-500'; // Leans Central
// North Dakota split
stateToTimeZoneMap['ND'] = 'fill-green-500'; // Leans Central
// Oregon split
stateToTimeZoneMap['OR'] = 'fill-red-500'; // Leans Pacific
// South Dakota split
stateToTimeZoneMap['SD'] = 'fill-green-500'; // Leans Central
// Tennessee split
stateToTimeZoneMap['TN'] = 'fill-blue-500'; // Leans Eastern
// Idaho split
stateToTimeZoneMap['ID'] = 'fill-yellow-600'; // Leans Mountain
// Kansas split
stateToTimeZoneMap['KS'] = 'fill-green-500'; // Leans Central
// Texas split (El Paso area is MT)
stateToTimeZoneMap['TX'] = 'fill-green-500'; // Primarily Central


const USTimeZoneMapGeographic = () => {
  const getStateClass = (stateAbbr) => {
    return stateToTimeZoneMap[stateAbbr] || 'fill-gray-400';
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 959 593" className="w-full h-auto max-h-[600px] rounded-lg shadow-md border border-gray-200 bg-gray-50">
      <style>
        {`.map-state:hover { opacity: 0.7; }`}
      </style>
      <g id="outlines">
        <path className={`map-state ${getStateClass('HI')}`} d="M159.8,543.8l2.3-3.3l2.1,1.1l-1,2.7l-2.1,0.3L159.8,543.8z M190.1,573.3l1.6-1.6l2.5,0.5l0.5,2.3l-2.3,1.3L190.1,573.3z M198.8,570.1l3-1.3l1.3,2.3l-2.3,1.8l-2.1-0.3L198.8,570.1z M229.3,559.6l2.3-0.3l2.1,1.3l-0.5,2.7l-2.3,0.3L229.3,559.6z M215.3,554.9l3.2-0.8l2.5,1.6l-1.6,2.7l-2.7,0.3L215.3,554.9z M249.8,550.2l2.7-0.3l1.3,2.3l-2.3,1.3l-1.6-1L249.8,550.2z M282.8,560.7l2.5-0.5l2.7,1.3l-1.3,2.3l-2.7,0.3L282.8,560.7z M262.1,556l2.7-0.3l2.1,1.1l-1.1,2.7l-2.3,0.3L262.1,556z"></path>
        <path className={`map-state ${getStateClass('AK')}`} d="M121.5,493.1l-0.6,18.3l-4.6,0.4l-1.5,10.1l18.5,1.1l8.3-4.8l12.9-11.6l7.9-14.8l-11.9-4.8l-5,4.6l-4.6-2.5l-10.8-1.1l-6.5,1.5l-2.6,3.5zm26.3-119.8l2.6-4.6l1.7-12.3l-5.2-6.2l-9.7-1.2l-12.8,1.1l-8.7,4.4l-7.2,9.4l-4.1,11.3l-0.2,16.1l5.9,3.9l5.4-1.7l5.4,1.7l2.8,6.2l7.9,2.3l11.5-4.6l5.2-6.8l4.5-9.9l0.4-7.5l-1.7-7.7z"></path>
        <path className={`map-state ${getStateClass('FL')}`} d="M860.5,442.1 l0.2,11.1l-5.3,3.2l-4.1,6.1l-1.6,12.5l3.7,4.4l2.5,12.7l-1.2,9.7l-5.3,3.4l-4.6,1.8l-4.8-0.9l-11.6-7.5l-5.3-9.2l-1.2-10.1l-4.1-4.4l-0.2-14.2l2.3-7l1.2-4.4l3-3.4l1.6-5.1l5.3-1.8l8.3-0.7l6.1,0.7l7.9,2.5l3,1.8zM806.4,440.5l3.2,1.2l4.3,5.2l2.3,10.1l-0.2,9.9l-2.7,5.7l-6.1,5.2l-4.3-1.5l-6.1-3.2l-5-7.5l-1.9-11.1l0.9-6.3l3.4-5.2l5.2-3.4l5.9-1.9z"></path>
        <path className={`map-state ${getStateClass('ME')}`} d="M931.3,103.9l1.2-5.9l-2.5-10.4l-10.4-10.6l-10.8-4.1l-7.5,0.9l-9.2,7.5l-6.3,12.3l-2.7,14.8l3.4,7.2l5.7,4.6l10.1,1.5l10.8-1.5l9.7-5.2l6.5-9.9z"></path>
        <path className={`map-state ${getStateClass('MI')}`} d="M706.9,179.3l3.4-1.9l4.8-6.3l2.5-10.4l-2.5-11.1l-6.8-7.9l-9.7-3.2l-11.1,0.9l-7.9,5.7l-3.7,9.2l0.7,10.4l5.2,8.1l9.4,5.9l7.2,2.7z M675.1,212.5l-1.2,10.4l-5.9,7.7l-10.8,4.8l-10.6-1.5l-7.5-7.7l-3.2-11.1l2.5-9.7l7.2-6.3l10.8-2.5l11.3,2.5l6.3,7.2l3.4,9.9z"></path>
        <path className={`map-state ${getStateClass('GA')}`} d="M827.2,346.6l1.5-10.1l-3.2-12.5l-10.1-11.1l-12.5-5.2l-10.8,1.5l-9.7,8.1l-6.3,12.7l-2.5,14.4l4.1,9.7l7.9,5.7l11.1,1.9l12.7-2.5l9.4-6.8l6.1-10.6z"></path>
        <path className={`map-state ${getStateClass('AL')}`} d="M775.5,352.8l0.9-12.7l-4.1-13.1l-11.1-10.4l-13.1-4.6l-10.4,2.5l-8.3,9.2l-5.7,13.1l-1.9,15.2l5.2,10.1l8.3,5.7l11.6,1.5l13.1-3.2l8.1-7.7l5.9-11.3z"></path>
        <path className={`map-state ${getStateClass('SC')}`} d="M867.8,310.5l1.2-9.9l-3.7-12.3l-10.6-10.8l-12.7-4.8l-10.4,1.9l-9.2,8.3l-5.9,12.9l-2.3,14.6l4.4,9.4l8.1,5.5l11.3,1.8l12.9-2.7l9.1-7l5.7-10.8z"></path>
        <path className={`map-state ${getStateClass('NC')}`} d="M876.5,269.5l1.5-10.1l-4.1-12.7l-11.1-11.3l-12.9-4.8l-10.1,2.5l-9,8.3l-5.7,13.1l-2.1,15l4.6,9.2l8.3,5.5l11.6,1.5l12.7-3l8.3-7.2l5.9-11.1z"></path>
        <path className={`map-state ${getStateClass('VA')}`} d="M859.6,229.8l1.2-10.4l-4.4-12.9l-11.3-11.6l-12.9-4.6l-9.9,2.7l-8.7,8.5l-5.5,13.4l-1.9,15.2l4.8,9l8.5,5.2l11.8,1.2l12.5-3.2l8.1-7.5l5.7-11.3z"></path>
        <path className={`map-state ${getStateClass('TN')}`} d="M765.8,287.8l-0.2-11.3l-5-12.9l-12.3-10.4l-14.2-3.7l-10.6,3.7l-8.5,10.1l-5,13.1l-0.9,14.8l6.1,9l9.9,4.8l13.6,0.4l14.4-4.4l7.7-8.5l5.9-10.6z"></path>
        <path className={`map-state ${getStateClass('KY')}`} d="M752.8,248.9l-0.4-11.6l-5.2-13.1l-12.7-10.1l-14.4-3.4l-10.4,4.1l-8.3,10.4l-4.8,13.4l-0.7,14.6l6.3,8.7l10.1,4.6l13.8,0.2l14.6-4.6l7.5-8.7l5.5-10.8z"></path>
        <path className={`map-state ${getStateClass('WV')}`} d="M810.2,224.2l0.4-10.8l-4.8-12.7l-11.8-10.8l-13.1-3.9l-9.7,3.2l-8.1,9.2l-4.8,12.7l-1.2,14.4l5.2,8.5l9,4.8l12.3,0.9l12.9-3.7l7.7-8.1l5.5-10.4z"></path>
        <path className={`map-state ${getStateClass('MD')}`} d="M848.5,191.2l-0.9-5.2l-3.2-4.1l-4.8-1.9l-3.7,0.2l-2.5,1.5l-1.2,3l0.2,2.5l1.5,1.9l3,0.9l3.7-0.7l2.7-1.2z M835.7,185.1l0.7-7.2l-4.1-7.7l-9.2-6.1l-8.3-1.2l-4.8,3l-2.5,6.3l0.9,5.5l4.1,3.7l7.2,1.2l8.5-0.9l6.3-2.3z"></path>
        <path className={`map-state ${getStateClass('DE')}`} d="M857.9,173.5l0.2-4.1l-1.5-3.2l-3-1.2l-2.7,0.4l-1.2,1.5l-0.4,2.1l0.7,1.5l1.9,0.7l2.5-0.4l1.9-0.9z"></path>
        <path className={`map-state ${getStateClass('NJ')}`} d="M878.2,155.3l0.7-7.9l-3.7-8.5l-8.7-6.5l-7.9-1.5l-4.6,3.2l-2.3,6.5l1.2,5.2l4.4,3.4l7.5,1.2l8.3-0.7l5.2-2.7z"></path>
        <path className={`map-state ${getStateClass('PA')}`} d="M831.5,164.7l0.9-11.1l-5.5-12.7l-12.9-9.7l-14.2-2.7l-10.1,4.6l-8.3,10.8l-4.6,13.6l-0.4,14.4l6.5,8.3l10.8,4.1l14.2-0.2l14.6-5.2l7.2-9.2l5.2-10.8z"></path>
        <path className={`map-state ${getStateClass('NY')}`} d="M864.2,113.2l1.9-11.3l-6.8-12.5l-14.2-8.7l-15-1.5l-10.6,5.9l-8.5,12.3l-4.1,14.4l0.4,14.6l7.9,8.1l12.5,3.4l15.2-1.2l14.2-6.5l7.2-10.1l4.6-12.9z"></path>
        <path className={`map-state ${getStateClass('CT')}`} d="M898.2,127.5l0.5-5.2l-2.5-4.8l-5.2-3l-4.8-0.2l-2.7,1.9l-1.2,3.4l0.7,3l2.3,2.1l3.7,0.5l4.4-0.5l3.4-1.5z"></path>
        <path className={`map-state ${getStateClass('RI')}`} d="M912.1,124.2l0.2-2.7l-1.2-2.5l-2.7-1.2l-2.3,0.2l-0.9,1.2l-0.2,1.5l0.5,1.2l1.2,0.5l1.9-0.2l1.2-0.7z"></path>
        <path className={`map-state ${getStateClass('MA')}`} d="M908.5,115.3l0.9-7.5l-3.7-8.1l-9-5.9l-8.3-1.2l-4.8,3.2l-2.7,6.3l1.2,5l4.6,3.2l7.7,0.9l8.5-0.9l5.9-2.7z"></path>
        <path className={`map-state ${getStateClass('VT')}`} d="M890.5,85.1l0.7-9.9l-3-9.4l-7.9-6.5l-7.2-1.2l-4.1,3.7l-2.1,7.2l1.5,6.3l4.8,4.1l7.9,0.7l7.7-0.5l4.8-3.2z"></path>
        <path className={`map-state ${getStateClass('NH')}`} d="M912.1,88.5l0.9-10.1l-3.2-9.7l-8.3-6.8l-7.5-1.5l-4.4,3.9l-2.3,7.5l1.8,6.1l5.2,3.9l8.1,0.9l7.9-0.7l4.8-3.4z"></path>
        <path className={`map-state ${getStateClass('OH')}`} d="M745.5,199.2l0.7-11.8l-5.9-12.9l-13.1-9.2l-14.2-2.1l-10.1,5.2l-8.1,11.3l-4.4,13.8l-0.2,14.2l6.8,8.1l11.3,3.7l14.2-0.7l14.2-5.5l6.8-9l4.8-10.8z"></path>
        <path className={`map-state ${getStateClass('IN')}`} d="M701.2,208.2l0.2-12.3l-6.1-12.7l-13.4-8.5l-14.2-1.2l-9.9,5.9l-7.7,11.8l-4.1,14.2l0.2,13.8l7.2,7.7l11.8,3l14.2-1.2l13.8-6.1l6.5-9.4l4.8-11.1z"></path>
        <path className={`map-state ${getStateClass('IL')}`} d="M659.2,218.5l-0.5-12.9l-6.5-12.5l-13.6-7.7l-14.2-0.2l-9.4,6.5l-7.2,12.3l-3.7,14.6l0.7,13.4l7.7,7.2l12.3,2.5l14.2-1.9l13.4-6.8l6.1-9.9l3.9-12.5z"></path>
        <path className={`map-state ${getStateClass('MS')}`} d="M697.2,361.5l-0.7-13.1l-5.9-12.9l-12.9-9.7l-13.8-2.7l-9.7,4.6l-7.7,11.1l-4.4,13.8l-0.2,14.4l6.5,8.5l10.8,3.9l13.8-0.4l13.8-5.5l6.3-9.4l4.6-11.3z"></path>
        <path className={`map-state ${getStateClass('LA')}`} d="M650.8,388.9l-0.9-12.3l-6.8-10.6l-13.8-7.2l-14.6-0.2l-10.1,5.5l-8.3,9.4l-5.2,11.8l-1.2,12.5l7.5,7.5l12.3,3l15.2-1.5l14.6-5.9l7.2-8.1l5.2-10.8z"></path>
        <path className={`map-state ${getStateClass('AR')}`} d="M647.2,326.8l-0.7-12.9l-6.3-12.7l-13.4-8.1l-14.2-0.9l-9.7,6.1l-7.5,11.8l-3.9,14.4l0.4,13.6l7.5,7.5l12.1,2.7l14.2-1.5l13.1-7l5.9-10.1l3.9-12.9z"></path>
        <path className={`map-state ${getStateClass('MO')}`} d="M635.9,263.9l-0.9-13.4l-6.8-12.3l-13.8-7l-14.8-0.2l-10.4,6.3l-8.1,11.8l-4.4,14.2l0.2,13.1l7.9,7l12.7,2.1l14.8-2.1l13.6-7.2l6.3-10.1l4.1-12.9z"></path>
        <path className={`map-state ${getStateClass('IA')}`} d="M619.2,209.2l-1.2-13.6l-7.2-11.8l-14.2-6.3l-15.2,0.2l-10.8,5.9l-8.5,11.3l-4.8,13.8l-0.2,12.9l8.3,6.8l13.1,1.8l15.2-2.5l13.8-7.5l6.5-10.1l4.1-12.1z"></path>
        <path className={`map-state ${getStateClass('WI')}`} d="M661.8,157.5l-0.9-11.3l-4.6-6.8l-4.1-4.1l-11.1-11.1l-15.5-5.5l-14.2,1.5l-10.4,7.7l-6.8,12.1l-3,13.1l1.5,11.1l7.2,7.5l12.1,3.2l15-1.2l13.1-5.2l8.1-8.5l6.1-10.1z"></path>
        <path className={`map-state ${getStateClass('MN')}`} d="M590.5,152.8l-1.5-14l-7.5-11.3l-14.4-5.5l-15.7,0.9l-11.1,5.5l-8.7,10.8l-5.2,13.6l-0.7,12.7l8.7,6.5l13.6,1.2l15.7-3l14.2-7.9l6.8-10.1l3.9-12.1z"></path>
        <path className={`map-state ${getStateClass('ND')}`} d="M538.5,135.2l-1.8-13.8l-7.9-10.6l-14.8-4.8l-15.9,1.2l-11.3,5.2l-9,10.4l-5.5,13.4l-0.9,12.3l9.2,6.3l14,0.9l15.9-3.2l14.4-8.1l7.2-10.1l4.1-12.1z"></path>
        <path className={`map-state ${getStateClass('SD')}`} d="M544.8,193.1l-1.6-13.8l-7.7-10.8l-14.6-5l-15.9,0.7l-11.3,5.5l-9,10.6l-5.5,13.6l-0.7,12.5l9,6.5l13.8,1.2l15.9-3.2l14.4-8.3l7-10.4l4.1-12.1z"></path>
        <path className={`map-state ${getStateClass('NE')}`} d="M550.2,251.8l-1.5-14l-7.5-11.1l-14.4-5.2l-15.7,0.4l-11.1,5.7l-8.7,10.8l-5.2,13.8l-0.5,12.7l8.7,6.5l13.6,1.1l15.7-3.4l14.2-8.5l6.8-10.4l3.9-12.3z"></path>
        <path className={`map-state ${getStateClass('KS')}`} d="M554.8,310.2l-1.2-14.2l-7.2-11.3l-14.2-5.5l-15.2,0.2l-10.8,5.9l-8.5,11.1l-4.8,13.8l-0.2,12.9l8.3,6.8l13.1,1.5l15.2-3l13.8-8.1l6.5-10.4l3.9-12.3z"></path>
        <path className={`map-state ${getStateClass('OK')}`} d="M562.1,366.2l-0.9-13.8l-6.8-11.6l-13.8-6.1l-14.6-0.2l-10.1,5.9l-8.3,10.8l-5.2,13.6l-0.7,12.5l7.5,7.5l12.3,2.5l15.2-1.9l14.6-7.2l7.2-10.1l4.4-12.9z M503,400 l10,0 l0,20 l-10,0 Z"></path>
        <path className={`map-state ${getStateClass('TX')}`} d="M574.8,445.5l-4.1-18.5l-11.3-15.5l-18.8-10.1l-20.8-3.7l-18.5,8.1l-15.2,15.9l-10.6,20.3l-4.8,22.1l12.1,14.4l20.1,8.7l23.9,2.5l25.3-10.1l18.3-18.5l12.1-22.8l6.5-25.3z"></path>
        <path className={`map-state ${getStateClass('NM')}`} d="M455.9,372.8l-1.2-15.9l-7.2-13.1l-14.2-7.5l-15.2-0.4l-10.8,7.5l-8.5,13.1l-4.8,15.7l-0.2,15.5l8.3,9.7l13.1,4.6l15.2-0.7l13.8-8.1l6.5-12.1l3.9-15.9z"></path>
        <path className={`map-state ${getStateClass('CO')}`} d="M465.9,291.5l-1.5-15.7l-7.5-13.4l-14.4-7.9l-15.7-0.7l-11.1,7.7l-8.7,13.4l-5.2,15.7l-0.5,15.2l8.7,9.4l13.6,4.4l15.7-0.9l14.2-8.3l6.8-12.3l3.9-15.7z"></path>
        <path className={`map-state ${getStateClass('WY')}`} d="M456.5,210.5l-1.2-15.5l-7.2-13.1l-14.2-7.9l-15.2-0.9l-10.8,7.7l-8.5,13.1l-4.8,15.5l-0.2,15l8.3,9.2l13.1,4.1l15.2-0.9l13.8-8.1l6.5-11.8l3.9-15.2z"></path>
        <path className={`map-state ${getStateClass('MT')}`} d="M435.2,137.2l-1.8-15.2l-7.9-12.5l-14.8-6.8l-15.9-0.2l-11.3,7l-9,12.5l-5.5,15.2l-0.9,14.8l9.2,8.5l14,3.4l15.9-1.5l14.4-9.2l7.2-12.5l4.1-15.2z"></path>
        <path className={`map-state ${getStateClass('ID')}`} d="M357.8,150.5l-0.9-18.3l-6.5-13.8l-13.6-8.1l-15-0.4l-10.8,8.1l-8.1,13.8l-4.4,18.1l-0.2,17.8l7.7,11.1l12.7,5.2l15.2-0.7l13.8-9.2l6.5-13.4l3.9-18.3z M360,100 l0,-20 l-20,0 l0,20 Z"></path>
        <path className={`map-state ${getStateClass('UT')}`} d="M366.5,292.8l-0.9-16.2l-6.8-13.4l-13.8-7.9l-14.6-0.9l-10.1,7.9l-8.3,13.4l-5.2,16.2l-0.7,15.7l7.5,9.7l12.3,4.6l15.2-1.2l14.6-8.5l7.2-12.5l4.1-16.2z"></path>
        <path className={`map-state ${getStateClass('AZ')}`} d="M352.8,378.2l-0.7-16.4l-6.3-13.6l-13.4-8.3l-14.2-1.2l-9.7,8.3l-7.5,13.6l-3.9,16.4l-0.4,15.9l7.5,10.1l12.1,4.8l14.2-1.5l13.1-8.7l5.9-12.7l3.9-16.4z"></path>
        <path className={`map-state ${getStateClass('NV')}`} d="M272.5,280.8l-0.2-17.2l-5.5-14.4l-12.7-9.4l-14.2-2.1l-10.1,9l-7.9,14.4l-4.1,17.2l-0.2,16.8l6.8,10.8l11.3,5.5l14.2-0.4l14.2-9.7l6.8-14l4.4-17.2z"></path>
        <path className={`map-state ${getStateClass('OR')}`} d="M248.2,174.5l-0.5-17.8l-5.9-14.6l-13.1-9.7l-14.2-2.5l-9.9,9.2l-7.7,14.6l-4.1,17.8l-0.2,17.4l7.2,11.3l11.8,5.9l14.2-0.7l13.8-10.1l6.5-14.4l4.1-17.8z"></path>
        <path className={`map-state ${getStateClass('WA')}`} d="M229.2,104.2l-0.7-17.4l-6.3-14.4l-13.4-9.2l-14.2-2.1l-9.7,9l-7.5,14.4l-3.9,17.4l-0.4,16.9l7.5,10.8l12.1,5.5l14.2-0.4l13.1-9.7l5.9-14.2l3.9-17.4z"></path>
        <path className={`map-state ${getStateClass('CA')}`} d="M165.8,295.5l-5.7-22.5l-12.1-19.2l-19.2-12.7l-21.5-5l-18.8,10.1l-15.5,19.6l-10.8,25.2l-5.2,27.2l12.5,18.3l20.3,11.3l24.8,3.7l25.9-12.9l18.8-22.8l12.5-28.3l7-30.8z"></path>
      </g>
      <g transform="translate(20, 580)" className="text-xs font-medium fill-gray-700">
        {timeZoneDetails.map((tz, index) => (
          <g key={tz.id} transform={`translate(${index * 120}, 0)`}>
            <rect width="20" height="15" className={tz.mapFillClass} />
            <text x="25" y="12">{tz.name.split('(')[0].trim()} ({tz.id})</text>
          </g>
        ))}
      </g>
    </svg>
  );
};


const TimeZones = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const getFormattedTime = (timeZone) => {
    return currentTime.toLocaleTimeString('en-US', {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <Card className="bg-white shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-800 flex items-center">
            <Clock className="mr-3 h-8 w-8 text-green-600" />
            Zonas Horarias de EE. UU.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timeZoneDetails.map((tz) => (
              <motion.div
                key={tz.id}
                className={`p-6 rounded-xl shadow-lg text-white transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 ${tz.color}`}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold">{tz.name}</h3>
                  <span className="text-sm opacity-80">{tz.id}</span>
                </div>
                <p className="text-4xl font-bold tracking-tight">
                  {getFormattedTime(tz.timeZone)}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Mapa Geográfico de Zonas Horarias (Aproximado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <USTimeZoneMapGeographic />
           <p className="text-xs text-gray-500 mt-2 text-center">
            Este mapa es una representación geográfica aproximada basada en la zona horaria principal de cada estado. Algunas áreas dentro de los estados pueden diferir.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TimeZones;