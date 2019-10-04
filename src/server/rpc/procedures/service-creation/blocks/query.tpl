<context>
  <inputs>
    <input><%= field %></input>
    <input><%= dataVariable %></input>
  </inputs>
  <variables/>
  <block s="reportEquals">
    <block s="reportListItem">
      <l>1</l>
      <block var="<%= dataVariable %>"/>
    </block>
    <block var="<%= field %>"/>
  </block>
  <receiver/>
  <context>
    <inputs/>
    <variables/>
    <receiver/>
  </context>
</context>
