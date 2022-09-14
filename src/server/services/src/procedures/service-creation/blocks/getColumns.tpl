<context id="1">
  <inputs>
    <input>row</input>
  </inputs>
  <variables/>
  <script>
    <block s="doReport">
      <block s="reportNewList">
        <list>
          <block s="reportListItem">
            <l>1</l>
            <block var="row"/>
          </block>
          <block s="reportListItem">
            <l><%= column %></l>
            <block var="row"/>
          </block>
        </list>
      </block>
    </block>
  </script>
  <receiver>
    <sprite name="Sprite" idx="1" x="0" y="0" heading="90" scale="1" rotation="1" draggable="true" costume="0" color="80,80,80" pen="tip" id="17">
      <costumes>
        <list id="18"/>
      </costumes>
      <sounds>
        <list id="19"/>
      </sounds>
      <variables/>
      <blocks/>
      <scripts/>
    </sprite>
  </receiver>
  <context id="22">
    <inputs/>
    <variables/>
    <receiver>
      <ref id="17"/>
    </receiver>
  </context>
</context>
