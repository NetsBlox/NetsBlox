<context id="1">
  <inputs>
    <input>data</input>
  </inputs>
  <variables/>
  <script>
    <block s="doDeclareVariables">
      <list>
        <l>field names</l>
      </list>
    </block>
    <block s="doSetVar">
      <l>field names</l>
      <block s="reportNewList">
        <list>
          <%= fields.map(field => `<l>${field}</l>`) %>
        </list>
      </block>
    </block>
    <block s="doReport">
      <block s="reportCONS">
        <block var="field names"/>
        <block var="data"/>
      </block>
    </block>
  </script>
  <receiver>
    <sprite name="Sprite" idx="1" x="0" y="0" heading="90" scale="1" rotation="1" draggable="true" costume="0" color="80,80,80" pen="tip" id="22">
      <costumes>
        <list id="23"/>
      </costumes>
      <sounds>
        <list id="24"/>
      </sounds>
      <variables/>
      <blocks/>
      <scripts/>
    </sprite>
  </receiver>
  <context id="27">
    <inputs/>
    <variables/>
    <receiver>
      <ref id="22"/>
    </receiver>
  </context>
</context>
